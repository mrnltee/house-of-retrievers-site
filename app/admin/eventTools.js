"use server";

import { actionAdmin, Forbidden } from "../lib/admin/guard";
import { decode, findPlusCode, isFullCode, isShortCode, parseCoordinates, recoverNearest } from "../lib/plusCode.mjs";

/*
 * Helpers the event editor calls while you type. They return data instead of
 * redirecting, and each checks the admin's role like any other action.
 */

// ---------- Venue search (OpenStreetMap Nominatim) ----------

// The overrides exist for local testing against a stand-in server.
const NOMINATIM = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org/search";
const GEMINI_BASE = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com";
const USER_AGENT = "HouseOfRetrieversAdmin/1.0 (+https://www.houseofretrieversph.org)";
const placeCache = new Map();
let lastSearchAt = 0;

const NOMINATIM_REVERSE = process.env.NOMINATIM_REVERSE_URL || NOMINATIM.replace(/\/search$/, "/reverse");
const SEARCH_FAILED = "The map search didn't answer. Try again in a moment, or paste a Google Maps link instead.";

/** One Nominatim request, at most one a second (their free-use rule). */
async function nominatim(base, params) {
  const wait = 1100 - (Date.now() - lastSearchAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastSearchAt = Date.now();
  const response = await fetch(`${base}?${new URLSearchParams({ format: "jsonv2", addressdetails: "1", ...params })}`, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function toPlace(row, point) {
  const a = row?.address || {};
  const city = a.city || a.town || a.municipality || a.village || a.county || a.state || "";
  const name = row?.name || String(row?.display_name || "").split(",")[0];
  return {
    name: String(name || "").slice(0, 160),
    city: city.slice(0, 80),
    address: String(row?.display_name || "").slice(0, 240),
    lat: point ? point.lat : Number(row?.lat),
    lng: point ? point.lng : Number(row?.lon),
  };
}

/**
 * The exact spot for a plus code ("7Q63H4XX+2V", or "H4XX+2V Makati") or
 * pasted coordinates ("14.5547, 121.0244"), with the address OpenStreetMap
 * has there. A short code needs the area after it, which is looked up first.
 * @returns {Promise<{ places?: object[], error?: string } | null>} null when the query is neither.
 */
async function searchExactSpot(query) {
  let point = parseCoordinates(query);
  let label = point ? `${point.lat}, ${point.lng}` : "";
  if (!point) {
    const found = findPlusCode(query);
    if (!found) return null;
    label = found.code;
    if (isFullCode(found.code)) {
      point = decode(found.code);
    } else if (isShortCode(found.code)) {
      if (!found.rest) return { error: `Add the area after the code, the way Google Maps shows it, e.g. "${found.code} Makati".` };
      const areas = await nominatim(NOMINATIM, { q: found.rest, limit: "1", countrycodes: "ph" });
      if (!Array.isArray(areas) || !areas.length) return { error: `Couldn't find "${found.rest}". Try the city name, e.g. "${found.code} Quezon City".` };
      point = recoverNearest(found.code, Number(areas[0].lat), Number(areas[0].lon));
    } else {
      return { error: "That plus code doesn't look complete. Copy it from Google Maps, e.g. \"H4XX+2V Makati\"." };
    }
  }
  const row = await nominatim(NOMINATIM_REVERSE, { lat: String(point.lat), lon: String(point.lng), zoom: "18" }).catch(() => null);
  const place = toPlace(row && !row.error ? row : null, point);
  if (!place.name) place.name = label;
  if (!place.address) place.address = `${point.lat}, ${point.lng}`;
  return { places: [place] };
}

/**
 * Up to six places in the Philippines matching `query`, or the exact spot
 * for a plus code or coordinates. Nominatim's free service asks for at most
 * one request a second and no search-as-you-type, so the editor searches on
 * a button press and results are cached.
 * @returns {Promise<{ places?: {name: string, city: string, address: string, lat: number, lng: number}[], error?: string }>}
 */
export async function searchPlaces(rawQuery) {
  try {
    await actionAdmin("events:edit");
  } catch (error) {
    if (error instanceof Forbidden) return { error: error.message };
    throw error;
  }
  const query = String(rawQuery || "").trim().replace(/\s+/g, " ").slice(0, 120);
  if (query.length < 3) return { error: "Type at least three letters of the venue's name, or a plus code." };
  const key = query.toLowerCase();
  if (placeCache.has(key)) return { places: placeCache.get(key) };

  let places;
  try {
    const exact = await searchExactSpot(query);
    if (exact?.error) return exact;
    if (exact) places = exact.places;
    else {
      const rows = await nominatim(NOMINATIM, { q: query, limit: "6", countrycodes: "ph" });
      places = (Array.isArray(rows) ? rows : []).map((row) => toPlace(row));
    }
  } catch (error) {
    console.warn("venue search failed", error.message);
    return { error: SEARCH_FAILED };
  }
  places = places.filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  placeCache.set(key, places);
  if (placeCache.size > 200) placeCache.delete(placeCache.keys().next().value);
  return { places };
}

// ---------- Photo description (Gemini) ----------

const GEMINI_MODELS = [process.env.GEMINI_MODEL, "gemini-2.5-flash", "gemini-flash-latest"].filter(Boolean);
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const PROMPT = `Write alt text for this photo, for people using a screen reader.
It is the cover photo of a House of Retrievers PH community event (a club of golden retriever and labrador owners in the Philippines).
Rules:
- One plain sentence, at most 150 characters.
- Describe only what is visible: the dogs (breed and colour only when clear), people, what they are doing, and the setting.
- Do not start with "Image of", "Photo of" or "A picture of".
- Do not name anyone, guess ages, or describe faces, bodies or clothing in detail.
- Include text only if it is clearly readable in the photo.
Reply with the sentence only.`;

/**
 * A suggested photo description, or a message saying why there isn't one.
 * Uses GEMINI_API_KEY (Google AI Studio). Without it the editor hides the button.
 * @param {string} dataUrl a JPEG data URL from the editor
 * @param {string} [title] the event title, as context only
 */
export async function describePhoto(dataUrl, title = "") {
  try {
    await actionAdmin("events:edit");
  } catch (error) {
    if (error instanceof Forbidden) return { error: error.message };
    throw error;
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "Automatic descriptions aren't switched on yet." };
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || match[2].length * 0.75 > MAX_PHOTO_BYTES) return { error: "That photo couldn't be described. Write a short description instead." };

  const context = String(title || "").trim().slice(0, 120);
  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: match[1], data: match[2] } },
          { text: context ? `${PROMPT}\nThe event is called "${context}". Use that only to understand the scene; never state anything you can't see.` : PROMPT },
        ],
      },
    ],
    generationConfig: { temperature: 0.2 },
  };

  for (const model of GEMINI_MODELS) {
    let response;
    try {
      response = await fetch(`${GEMINI_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      });
    } catch (error) {
      console.warn("photo description failed", model, error.message);
      return { error: "The description service didn't answer. Try again, or write one yourself." };
    }
    // A retired or unknown model name: try the next one.
    if (response.status === 404) continue;
    if (response.status === 429) return { error: "The free description allowance is used up for now. Try again later, or write one yourself." };
    if (!response.ok) {
      console.warn("photo description refused", model, response.status);
      return { error: "The description service refused that photo. Write a short description instead." };
    }
    const json = await response.json().catch(() => null);
    const text = (json?.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join(" ");
    const alt = text.replace(/\s+/g, " ").replace(/^["'“]|["'”]$/g, "").trim().slice(0, 200);
    if (!alt) return { error: "No description came back. Write a short one instead." };
    return { alt };
  }
  return { error: "The description model isn't available. Set GEMINI_MODEL in Vercel to a current Gemini model name." };
}
