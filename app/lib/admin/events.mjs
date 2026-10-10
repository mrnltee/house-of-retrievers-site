/**
 * Event records: validation for the admin editor, and the shape the public
 * events page reads (the HorEvent typedef in app/content/events.js).
 */

export const CATEGORIES = ["Community outreach", "Socials & runs", "Workshops", "Fundraisers"];

export const PURPOSES = ["Purpose to Give Back", "Purpose to Care", "Purpose to Connect", "Purpose to Learn", "Purpose to Celebrate"];

/** Longest summary the editor accepts. The card shows the start; the event page shows all of it. */
export const SUMMARY_MAX = 3000;
export const MAX_HASHTAGS = 6;

/** Today's date in Manila, "YYYY-MM-DD". */
export function manilaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * A past event is a record of something that happened: details and photos,
 * never sign-ups. True when the date is before today in Manila.
 */
export function isPastDate(date, today = manilaDate()) {
  return isIsoDate(date) && date < today;
}

/**
 * "#PawsForAPurpose, #HORph run" → ["PawsForAPurpose", "HORph", "run"].
 * Split on spaces, commas and #; kept as typed (letters, numbers,
 * underscores); de-duplicated ignoring case; at most MAX_HASHTAGS.
 * @param {string | string[]} input
 * @returns {string[]}
 */
export function parseHashtags(input) {
  const parts = Array.isArray(input) ? input : String(input || "").split(/[\s,#]+/);
  const seen = new Set();
  const tags = [];
  for (const part of parts) {
    const tag = String(part).replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 40);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
    if (tags.length === MAX_HASHTAGS) break;
  }
  return tags;
}

const GOOGLE_MAPS_HOSTS = ["maps.app.goo.gl", "goo.gl", "maps.google.com", "www.google.com", "google.com", "www.google.com.ph", "google.com.ph"];

/** A Google Maps share or place link, or null. */
export function cleanMapUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" || !GOOGLE_MAPS_HOSTS.includes(url.hostname)) return undefined;
  if (url.hostname.endsWith("goo.gl") && url.hostname !== "maps.app.goo.gl" && !url.pathname.startsWith("/maps")) return undefined;
  if (url.hostname.includes("google.com") && !url.pathname.startsWith("/maps") && url.hostname !== "maps.google.com") return undefined;
  return url.toString().slice(0, 500);
}

/** Where "Get directions" goes: the pasted Google Maps link, else the pin, else a search. */
export function directionsUrl({ mapUrl, venueLat, venueLng, venue, city }) {
  if (mapUrl) return mapUrl;
  if (Number.isFinite(venueLat) && Number.isFinite(venueLng)) {
    return `https://www.google.com/maps/search/?api=1&query=${venueLat},${venueLng}`;
  }
  const place = [venue, city].filter(Boolean).join(", ");
  return place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null;
}

const clean = (value, max = 200) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "");
// Keeps paragraphs: line breaks survive, runs of blank lines collapse to one.
const cleanText = (value, max = 600) =>
  typeof value === "string" ? value.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "";
const coord = (value, limit) => {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? Math.round(n * 1e6) / 1e6 : null;
};

export function slugify(title, date) {
  const base = clean(title, 80)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return [base || "event", (date || "").slice(0, 7)].filter(Boolean).join("-");
}

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/**
 * Validates the editor form. Drafts may be incomplete; publishing needs every
 * fact the public page shows.
 * @returns {{ value?: object, error?: string, missing?: string[] }}
 */
export function validateEvent(input, { publish = false, today = manilaDate() } = {}) {
  const value = {
    title: clean(input?.title, 120),
    category: clean(input?.category, 40),
    date: clean(input?.date, 10),
    startTime: clean(input?.startTime, 5) || null,
    endTime: clean(input?.endTime, 5) || null,
    venue: clean(input?.venue, 160),
    city: clean(input?.city, 80),
    cost: clean(input?.cost, 60) || null,
    isCharity: input?.isCharity === true || input?.isCharity === "on" || input?.isCharity === "true",
    supports: clean(input?.supports, 160) || null,
    purpose: clean(input?.purpose, 40) || null,
    summary: cleanText(input?.summary, SUMMARY_MAX) || null,
    hashtags: parseHashtags(input?.hashtags),
    venueLat: coord(input?.venueLat, 90),
    venueLng: coord(input?.venueLng, 180),
    mapUrl: cleanMapUrl(input?.mapUrl),
    image: clean(input?.image, 300) || null,
    imageAlt: clean(input?.imageAlt, 200) || null,
    registration: input?.registration === "required" ? "required" : "none",
    capacity: input?.capacity === "" || input?.capacity == null ? null : Number(input.capacity),
    rsvpOpen: input?.rsvpOpen === undefined ? true : input.rsvpOpen === true || input.rsvpOpen === "on" || input.rsvpOpen === "true",
    feeRequired: input?.feeRequired === true || input?.feeRequired === "on" || input?.feeRequired === "true",
  };

  // The beneficiary belongs to charity events only.
  if (!value.isCharity) value.supports = null;
  if (value.venueLat == null || value.venueLng == null) value.venueLat = value.venueLng = null;

  if (!value.title) return { error: "Give the event a title." };
  if (value.purpose && !PURPOSES.includes(value.purpose)) return { error: "Pick a purpose from the list." };
  if (value.mapUrl === undefined) return { error: "The map link should be a Google Maps link, like https://maps.app.goo.gl/…" };
  if (!isIsoDate(value.date)) return { error: "Pick a date." };
  if (value.category && !CATEGORIES.includes(value.category)) return { error: "Pick a category from the list." };
  if (value.startTime && !isTime(value.startTime)) return { error: "Start time should look like 07:00." };
  if (value.endTime && !isTime(value.endTime)) return { error: "End time should look like 10:00." };
  if (value.startTime && value.endTime && value.endTime <= value.startTime) return { error: "End time should be after the start time." };
  if (value.capacity != null && (!Number.isInteger(value.capacity) || value.capacity < 1 || value.capacity > 5000)) {
    return { error: "Capacity should be a whole number, or empty for no limit." };
  }
  if (value.image && !value.image.startsWith("/") && !value.image.startsWith("https://")) return { error: "The photo must be a site path like /4-events/run.jpg or an https link." };

  // An event that has already happened takes no sign-ups, whatever the form says.
  if (isPastDate(value.date, today)) {
    value.registration = "none";
    value.capacity = null;
    value.rsvpOpen = false;
    value.feeRequired = false;
  }

  const missing = [];
  if (!value.category) missing.push("Category");
  if (!value.venue) missing.push("Venue");
  if (!value.city) missing.push("City");
  if (!value.summary) missing.push("Summary");
  if (value.isCharity && !value.supports) missing.push("Beneficiary");
  if (publish && missing.length) return { error: `Fill these before publishing: ${missing.join(", ")}.`, missing };
  return { value, missing };
}

/** How many slots before we say "Few spots left". */
export function fewLeftThreshold(capacity) {
  return Math.max(3, Math.ceil(capacity * 0.1));
}

/** The status chip the public page shows. */
export function publicStatus(row, confirmed = 0) {
  if (row.status === "cancelled") return "cancelled";
  if (row.registration !== "required") return "no-rsvp";
  if (!row.rsvp_open) return "closed";
  if (row.capacity) {
    const left = row.capacity - confirmed;
    if (left <= 0) return "full";
    if (left <= fewLeftThreshold(row.capacity)) return "few-left";
  }
  return "open";
}

const toDateString = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10));

/** DB row (+ confirmed count) → HorEvent for EventsView. */
export function toPublicEvent(row, confirmed = 0) {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    date: toDateString(row.date),
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    venue: row.venue,
    city: row.city,
    cost: row.cost || undefined,
    supports: (row.is_charity && row.supports) || undefined,
    purpose: row.purpose || undefined,
    summary: row.summary || undefined,
    hashtags: row.hashtags?.length ? row.hashtags : undefined,
    directions: directionsUrl({ mapUrl: row.map_url, venueLat: row.venue_lat, venueLng: row.venue_lng, venue: row.venue, city: row.city }) || undefined,
    venueLat: row.venue_lat ?? undefined,
    venueLng: row.venue_lng ?? undefined,
    status: publicStatus(row, confirmed),
    image: row.image || undefined,
    imageAlt: row.image_alt || undefined,
    rsvp: row.registration === "required",
    feeRequired: row.fee_required,
  };
}
