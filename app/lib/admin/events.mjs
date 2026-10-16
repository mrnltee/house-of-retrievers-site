/**
 * Event records: validation for the admin editor, and the shape the public
 * events page reads (the HorEvent typedef in app/content/events.js).
 */

import { activeTiers, cleanTiers, hasTierDates, priceSummary, tierLeft, tierWindow, tiersFromCost } from "../prices.mjs";
import { opensLater, readOpensAt } from "../rsvpOpens.mjs";
import { eventEndsAt } from "../eventTime.mjs";
import { cleanFurbabyPricing, cleanPricingBasis } from "../registrationPricing.mjs";

export const CATEGORIES = ["Community outreach", "Socials & runs", "Workshops", "Fundraisers"];

export const PURPOSES = ["Purpose to Give Back", "Purpose to Care", "Purpose to Connect", "Purpose to Learn", "Purpose to Celebrate"];

/** Longest summary the editor accepts. The card shows the start; the event page shows all of it. */
export const SUMMARY_MAX = 3000;
export const MAX_HASHTAGS = 6;
/** Photos beside the cover, shown whole on the event page: four pictures in all. */
export const MAX_GALLERY = 3;
/** How a picture sits in the event page's frame. */
export const IMAGE_FITS = [
  ["fit", "Fit", "Whole picture, nothing cut off"],
  ["fill", "Fill", "Fills the frame; edges may be cropped"],
  ["tile", "Tile", "Repeated as a pattern"],
];
const FIT_KEYS = IMAGE_FITS.map(([key]) => key);
export const cleanFit = (value) => (FIT_KEYS.includes(value) ? value : "fit");

/** Up to this many "What's included" lines. */
export const MAX_INCLUDED = 10;

export const RSVP_FORM_DEFAULT = { optional: ["photoConsent", "under18"], order: ["identity", "attendees", "photoConsent", "under18", "vaccination"] };
export function cleanRsvpFormConfig(input) {
  let value = input;
  if (typeof input === "string") { try { value = JSON.parse(input || "{}"); } catch { value = {}; } }
  const optional = ["photoConsent", "under18", "vaccination"].filter((key) => Array.isArray(value?.optional) && value.optional.includes(key));
  const allowed = new Set(["identity", "attendees", "photoConsent", "under18", "vaccination"]);
  const order = Array.isArray(value?.order) ? value.order.filter((key, i, list) => allowed.has(key) && list.indexOf(key) === i) : [];
  for (const key of ["identity", "attendees", ...optional]) if (!order.includes(key)) order.push(key);
  return { optional: optional.length ? optional : RSVP_FORM_DEFAULT.optional, order };
}

/** "TBA", "To be named" and the like: not a beneficiary, so never shown or published. */
export const isPlaceholder = (text) =>
  /^(t\.?b\.?[adc]\.?|to be (named|announced|confirmed|decided|followed)|to follow|n\/?a|none|pending|-+|\?+)$/i.test(String(text || "").trim());

/** One item per line (or an array) → up to MAX_INCLUDED short lines. */
export function cleanIncluded(input) {
  const list = Array.isArray(input) ? input : String(input || "").split(/\r?\n/);
  return list.map((line) => String(line).replace(/^[\s•\-*✓]+/, "").trim().replace(/\s+/g, " ").slice(0, 80)).filter(Boolean).slice(0, MAX_INCLUDED);
}

/** Who may add photos to an album once the member portal exists. */
export const PHOTO_UPLOADERS = [
  ["attendees", "Attendees"],
  ["members", "Members"],
  ["volunteers", "Volunteers"],
  ["partners", "Partners"],
  ["sponsors", "Sponsors"],
];
const IMAGE_PATH = /^\/api\/event-image\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The extra photos as sent by the editor → [{ src, alt }], or { error }. */
export function cleanGallery(input) {
  let rows = input;
  if (typeof input === "string") {
    try {
      rows = JSON.parse(input || "[]");
    } catch {
      return { error: "The extra photos didn't come through. Add them again." };
    }
  }
  if (!Array.isArray(rows)) return { gallery: [] };
  const gallery = rows
    .filter((row) => IMAGE_PATH.test(String(row?.src || "")))
    .map((row) => ({ src: row.src, alt: String(row.alt || "").trim().replace(/\s+/g, " ").slice(0, 200), fit: cleanFit(row.fit) }));
  if (gallery.length > MAX_GALLERY) return { error: `Up to ${MAX_GALLERY + 1} photos per event, cover included.` };
  return { gallery };
}

/** Checked boxes (an array or "a,b") → the known uploader groups. */
export function cleanUploaders(input) {
  const list = Array.isArray(input) ? input : String(input || "").split(",");
  const known = PHOTO_UPLOADERS.map(([key]) => key);
  return known.filter((key) => list.includes(key));
}

/** Paths the events site already uses, which an event's address must not take. */
const RESERVED_SLUGS = ["r", "share", "new", "api", "admin", "events", "sitemap", "robots"];

/**
 * An event's web address as typed in the editor → the slug to save.
 * "Free Hugs Day 2026!" → "free-hugs-day-2026".
 * @returns {{ slug?: string, error?: string }}
 */
export function cleanSlug(input) {
  const slug = String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  if (slug.length < 3) return { error: "The web address needs at least three letters or numbers." };
  if (RESERVED_SLUGS.includes(slug)) return { error: `"${slug}" is used by the events site itself. Pick another web address.` };
  return { slug };
}

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

/**
 * "Parking nearby": Google Maps' parking search around the pin, else around
 * the venue's name. Opens the Maps app on phones, like "Get directions".
 */
export function parkingUrl({ venueLat, venueLng, venue, city }) {
  if (Number.isFinite(venueLat) && Number.isFinite(venueLng)) {
    return `https://www.google.com/maps/search/parking/@${venueLat},${venueLng},17z`;
  }
  const place = [venue, city].filter(Boolean).join(", ");
  return place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`parking near ${place}`)}` : null;
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

/** Partners and sponsors listed on one event. */
export const MAX_SUPPORTERS = 8;

/** Names typed or picked in the editor: trimmed, de-duplicated ignoring case, at most 8. */
export function cleanNames(input) {
  let list = input;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = list.split(/\r?\n/);
    }
  }
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const name = String(item ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
    if (out.length >= MAX_SUPPORTERS) break;
  }
  return out;
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
    allDay: input?.allDay === true || input?.allDay === "on" || input?.allDay === "true",
    startTime: clean(input?.startTime, 5) || null,
    endTime: clean(input?.endTime, 5) || null,
    partners: cleanNames(input?.partners),
    sponsors: cleanNames(input?.sponsors),
    venue: clean(input?.venue, 160),
    city: clean(input?.city, 80),
    venueAddress: clean(input?.venueAddress, 200) || null,
    included: cleanIncluded(input?.included),
    cost: clean(input?.cost, 60) || null,
    priceTiers: [],
    gallery: [],
    photoUploads: cleanUploaders(input?.photoUploads),
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
    imageFit: cleanFit(input?.imageFit),
    registration: input?.registration === "required" ? "required" : "none",
    capacity: input?.capacity === "" || input?.capacity == null ? null : Number(input.capacity),
    // Older editor posts did not send this field when open, so preserve their
    // open default. Current forms send rsvpOpenSent, making a deliberate
    // closed-registration choice unambiguous.
    rsvpOpen: input?.rsvpOpenSent === undefined && input?.rsvpOpen === undefined
      ? true
      : input.rsvpOpen === true || input.rsvpOpen === "on" || input.rsvpOpen === "true",
    rsvpLabel: clean(input?.rsvpLabel, 40) || null,
    vaccinationRecordRequired: input?.vaccinationRecordRequired === true || input?.vaccinationRecordRequired === "on" || input?.vaccinationRecordRequired === "true",
    feeRequired: input?.feeRequired === true || input?.feeRequired === "on" || input?.feeRequired === "true",
    onsitePayment: input?.onsitePayment === true || input?.onsitePayment === "on" || input?.onsitePayment === "true",
    pricingBasis: cleanPricingBasis(input?.pricingBasis),
    includedFurbabiesPerHuman: 0,
    additionalFurbabyFee: 0,
    rsvpOpensAt: null,
  };

  // An all-day event has no times.
  if (value.allDay) value.startTime = value.endTime = null;

  // The beneficiary belongs to charity events only, and a placeholder isn't one.
  if (!value.isCharity || isPlaceholder(value.supports)) value.supports = null;
  if (value.venueLat == null || value.venueLng == null) value.venueLat = value.venueLng = null;

  // Prices: tiers from the editor decide the cost line; without them the typed cost stays.
  if (input?.priceTiers !== undefined) {
    const { tiers, error } = cleanTiers(input.priceTiers, { pricingBasis: value.pricingBasis });
    if (error) return { error };
    value.priceTiers = tiers;
    value.cost = priceSummary(tiers) || value.cost;
  }
  const companionPricing = cleanFurbabyPricing(input?.includedFurbabiesPerHuman, input?.additionalFurbabyFee);
  if (companionPricing.error) return { error: companionPricing.error };
  if (value.pricingBasis === "human_plus_furbaby") Object.assign(value, companionPricing);
  // Nothing to pay, nothing to track.
  if (!value.priceTiers.some((t) => t.amount > 0) && input?.priceTiers !== undefined) value.feeRequired = false;
  if (input?.gallery !== undefined) {
    const { gallery, error } = cleanGallery(input.gallery);
    if (error) return { error };
    value.gallery = gallery;
  }

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

  // A scheduled opening (Manila time) has to come before the event ends.
  if (value.registration === "required") {
    const opens = readOpensAt(input, eventEndsAt({ date: value.date, startTime: value.startTime, endTime: value.endTime, allDay: value.allDay }));
    if (opens.error) return { error: opens.error };
    value.rsvpOpensAt = opens.value;
  }

  // An event that has already happened takes no sign-ups, whatever the form says.
  if (isPastDate(value.date, today)) {
    value.registration = "none";
    value.capacity = null;
    value.rsvpOpen = false;
    value.feeRequired = false;
    value.rsvpOpensAt = null;
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
export function publicStatus(row, confirmed = 0, now = Date.now()) {
  if (row.status === "cancelled") return "cancelled";
  if (row.registration !== "required") return "no-rsvp";
  if (!row.rsvp_open) return "closed";
  // A scheduled opening still ahead: the pages count down to it.
  if (opensLater(row.rsvp_opens_at instanceof Date ? row.rsvp_opens_at.toISOString() : row.rsvp_opens_at, now)) return "soon";
  if (row.capacity) {
    const left = row.capacity - confirmed;
    if (left <= 0) return "full";
    if (left <= fewLeftThreshold(row.capacity)) return "few-left";
  }
  return "open";
}

const toDateString = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10));

/** An event's price tiers: saved tiers, else read from its older cost text. */
export function eventTiers(row) {
  if (Array.isArray(row.price_tiers) && row.price_tiers.length) return row.price_tiers;
  return tiersFromCost(row.cost) || [];
}

/** DB row (+ confirmed count) → HorEvent for EventsView. */
export function toPublicEvent(row, confirmed = 0) {
  const tiers = eventTiers(row);
  // Registrations per ticket (TICKET_COUNTS_COLUMN), for tiers limited to the first N.
  const counts = row.ticket_counts && typeof row.ticket_counts === "object" ? row.ticket_counts : {};
  const gallery = Array.isArray(row.gallery) ? row.gallery : [];
  // On the event page every picture is shown whole: the cover as uploaded (before
  // it was framed for the card), then the extra photos.
  // "Fill" uses the crop framed in the editor; "fit" and "tile" the photo as uploaded.
  const coverFit = cleanFit(row.image_fit);
  const media = row.image
    ? [{ src: coverFit === "fill" ? row.image : row.image_source || row.image, alt: row.image_alt || "", fit: coverFit }, ...gallery.map((g) => ({ ...g, fit: cleanFit(g.fit) }))]
    : gallery.map((g) => ({ ...g, fit: cleanFit(g.fit) }));
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    date: toDateString(row.date),
    allDay: row.all_day || undefined,
    startTime: (!row.all_day && row.start_time) || undefined,
    endTime: (!row.all_day && row.end_time) || undefined,
    partners: row.partners?.length ? row.partners : undefined,
    sponsors: row.sponsors?.length ? row.sponsors : undefined,
    venue: row.venue,
    city: row.city,
    // With sale periods, the card shows what's on sale now (5-minute page cache).
    cost: (hasTierDates(tiers) ? priceSummary(activeTiers(tiers, Date.now(), counts)) : priceSummary(tiers)) || row.cost || undefined,
    // Listed lowest first, the order people compare them in.
    // Each tier with its sale period in words ("Until Oct 10, 11:59 PM", "Ended Oct 10").
    priceTiers: tiers.length > 1 || tiers.some((t) => t.label)
      ? [...tiers].sort((a, b) => a.amount - b.amount).map((t) => {
          const left = tierLeft(t, counts);
          const window = [t.limit ? (left === 0 ? `Sold out · it was for the first ${t.limit}` : `First ${t.limit} registrants · ${left} left`) : "", tierWindow(t)].filter(Boolean).join(" · ");
          return { label: t.label, amount: t.amount, window: window || undefined, ended: Boolean((t.until && Date.now() >= Date.parse(t.until)) || left === 0) || undefined };
        })
      : undefined,
    supports: (row.is_charity && row.supports && !isPlaceholder(row.supports) && row.supports) || undefined,
    venueAddress: row.venue_address || undefined,
    included: row.included?.length ? row.included : undefined,
    purpose: row.purpose || undefined,
    summary: row.summary || undefined,
    hashtags: row.hashtags?.length ? row.hashtags : undefined,
    directions: directionsUrl({ mapUrl: row.map_url, venueLat: row.venue_lat, venueLng: row.venue_lng, venue: row.venue, city: row.city }) || undefined,
    parking: parkingUrl({ venueLat: row.venue_lat, venueLng: row.venue_lng, venue: row.venue, city: row.city }) || undefined,
    venueLat: row.venue_lat ?? undefined,
    venueLng: row.venue_lng ?? undefined,
    status: publicStatus(row, confirmed),
    // With "soon", the moment RSVPs open and the status the page switches to then.
    rsvpOpensAt: row.rsvp_opens_at ? new Date(row.rsvp_opens_at).toISOString() : undefined,
    openStatus: publicStatus({ ...row, rsvp_opens_at: null }, confirmed),
    image: row.image || undefined,
    imageAlt: row.image_alt || undefined,
    media: media.length ? media : undefined,
    rsvp: row.registration === "required",
    rsvpLabel: row.rsvp_label || undefined,
    vaccinationRecordRequired: Boolean(row.vaccination_record_required),
    rsvpFormConfig: cleanRsvpFormConfig(row.rsvp_form_config),
    feeRequired: row.fee_required,
    isCharity: Boolean(row.is_charity),
    onsitePayment: Boolean(row.onsite_payment),
    pricingBasis: cleanPricingBasis(row.pricing_basis),
    includedFurbabiesPerHuman: row.included_furbabies_per_human || 0,
    additionalFurbabyFee: row.additional_furbaby_fee || 0,
    // The tickets to choose from when RSVPing to a paid event, in the order the RSVP route reads them.
    tickets: row.fee_required && tiers.length ? tiers.map((t) => ({ label: t.label || "", amount: t.amount, bundleHumans: t.bundleHumans, bundleFurbabies: t.bundleFurbabies, attendanceBasis: t.attendanceBasis, includedHumansPerFurbaby: t.includedHumansPerFurbaby, additionalHumanFee: t.additionalHumanFee, from: t.from, until: t.until, limit: t.limit, left: tierLeft(t, counts) ?? undefined })) : undefined,
  };
}
