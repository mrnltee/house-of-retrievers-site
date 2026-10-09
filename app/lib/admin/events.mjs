/**
 * Event records: validation for the admin editor, and the shape the public
 * events page reads (the HorEvent typedef in app/content/events.js).
 */

export const CATEGORIES = ["Community outreach", "Socials & runs", "Workshops", "Fundraisers"];

const clean = (value, max = 200) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "");
const cleanText = (value, max = 600) => (typeof value === "string" ? value.trim().slice(0, max) : "");

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
export function validateEvent(input, { publish = false } = {}) {
  const value = {
    title: clean(input?.title, 120),
    category: clean(input?.category, 40),
    date: clean(input?.date, 10),
    startTime: clean(input?.startTime, 5) || null,
    endTime: clean(input?.endTime, 5) || null,
    venue: clean(input?.venue, 160),
    city: clean(input?.city, 80),
    cost: clean(input?.cost, 60) || null,
    supports: clean(input?.supports, 160) || null,
    summary: cleanText(input?.summary, 600) || null,
    image: clean(input?.image, 300) || null,
    imageAlt: clean(input?.imageAlt, 200) || null,
    registration: input?.registration === "required" ? "required" : "none",
    capacity: input?.capacity === "" || input?.capacity == null ? null : Number(input.capacity),
    rsvpOpen: input?.rsvpOpen === undefined ? true : input.rsvpOpen === true || input.rsvpOpen === "on" || input.rsvpOpen === "true",
    feeRequired: input?.feeRequired === true || input?.feeRequired === "on" || input?.feeRequired === "true",
  };

  if (!value.title) return { error: "Give the event a title." };
  if (!isIsoDate(value.date)) return { error: "Pick a date." };
  if (value.category && !CATEGORIES.includes(value.category)) return { error: "Pick a category from the list." };
  if (value.startTime && !isTime(value.startTime)) return { error: "Start time should look like 07:00." };
  if (value.endTime && !isTime(value.endTime)) return { error: "End time should look like 10:00." };
  if (value.startTime && value.endTime && value.endTime <= value.startTime) return { error: "End time should be after the start time." };
  if (value.capacity != null && (!Number.isInteger(value.capacity) || value.capacity < 1 || value.capacity > 5000)) {
    return { error: "Capacity should be a whole number, or empty for no limit." };
  }
  if (value.image && !value.image.startsWith("/") && !value.image.startsWith("https://")) return { error: "The photo must be a site path like /4-events/run.jpg or an https link." };

  const missing = [];
  if (!value.category) missing.push("Category");
  if (!value.venue) missing.push("Venue");
  if (!value.city) missing.push("City");
  if (!value.summary) missing.push("Summary");
  if (value.image && !value.imageAlt) missing.push("Photo description");
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
    supports: row.supports || undefined,
    summary: row.summary || undefined,
    status: publicStatus(row, confirmed),
    image: row.image || undefined,
    imageAlt: row.image_alt || undefined,
    rsvp: row.registration === "required",
    feeRequired: row.fee_required,
  };
}
