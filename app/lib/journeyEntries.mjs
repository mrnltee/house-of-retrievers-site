/**
 * Journey entries (migration 054): the homepage "Our journey" stops, kept in
 * the database and edited in admin → Settings → Journey timeline.
 *
 * A row becomes the same stop shape app/components/Journey.jsx always used
 * (see the JourneyStop typedef in app/content/journey.js), so the page renders
 * exactly as before. Past and upcoming come from the date: an exact date is
 * compared with today in Manila; a month-only stop (seeded from the old file)
 * is past within its own month, as before; no date at all shows "Soon".
 */

export const JOURNEY_LIMITS = { title: 120, theme: 120, place: 160, story: 400, tag: 40, alt: 200 };
export const MAX_JOURNEY_PHOTOS = 12;
export const JOURNEY_MARKS = ["first", "milestone"];

const oneLine = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** "YYYY-MM-DD" for a moment, in Manila. */
export function manilaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** A real calendar date "YYYY-MM-DD", or null. */
export function cleanDate(value) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text ? text : null;
}

/** A URL-safe slug from a title, e.g. "Pawres de Mayo!" → "pawres-de-mayo". */
export function slugifyEntry(title) {
  const slug = String(title ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/, "");
  return slug || "stop";
}

/**
 * Checks an entry form. Returns { value } or { error } (plain words for the admin).
 * @param {{ title?: unknown, theme?: unknown, place?: unknown, story?: unknown, tag?: unknown, mark?: unknown, date?: unknown }} raw
 */
export function cleanEntry(raw) {
  const value = {
    title: oneLine(raw.title, JOURNEY_LIMITS.title),
    theme: oneLine(raw.theme, JOURNEY_LIMITS.theme) || null,
    place: oneLine(raw.place, JOURNEY_LIMITS.place) || null,
    story: oneLine(raw.story, JOURNEY_LIMITS.story) || null,
    tag: oneLine(raw.tag, JOURNEY_LIMITS.tag) || null,
    mark: JOURNEY_MARKS.includes(raw.mark) ? raw.mark : null,
    date: null,
  };
  if (!value.title) return { error: "Give the stop a title." };
  const dateText = String(raw.date ?? "").trim();
  if (dateText) {
    value.date = cleanDate(dateText);
    if (!value.date) return { error: "That date isn't a real day. Use the date picker." };
  }
  return { value };
}

/** Text for a photo's description, or "" (optional; toStop fills a default). */
export const cleanAlt = (value) => oneLine(value, JOURNEY_LIMITS.alt);

/** The "YYYY-MM" a row sits in, or null when it has no date yet. */
export function entryMonth(row) {
  if (row.happened_on) return String(row.happened_on).slice(0, 7);
  return row.month || null;
}

/**
 * "past" | "upcoming" for a row. Exact date: before today is past. Month only:
 * earlier months past, later upcoming, the current month past (the old default).
 */
export function entryStatus(row, today = manilaDate()) {
  if (row.happened_on) return String(row.happened_on).slice(0, 10) < today ? "past" : "upcoming";
  if (!row.month) return "upcoming";
  return row.month <= today.slice(0, 7) ? "past" : "upcoming";
}

/** Oldest first: by date (a month-only stop counts as its 1st), then position; undated last. */
export function sortEntries(rows) {
  const key = (row) => (row.happened_on ? String(row.happened_on).slice(0, 10) : row.month ? `${row.month}-01` : "9999-99-99");
  return [...rows].sort((a, b) => key(a).localeCompare(key(b)) || (a.position ?? 0) - (b.position ?? 0));
}

/**
 * One database row (plus its photos) → the stop shape Journey.jsx renders.
 * `upcoming` is set only where the old file needed it (a later day this month),
 * so the component's month logic gives the same answer as entryStatus.
 * @param {object} row  journey_entries row, with event_slug/event_status when linked
 * @param {{ src: string, alt: string, fit: string }[]} photos  in order, src already resolved
 */
export function toStop(row, photos, today = manilaDate()) {
  const month = entryMonth(row);
  const stop = { id: row.slug, title: row.title };
  if (month) stop.month = month;
  for (const key of ["theme", "place", "story", "tag", "mark"]) if (row[key]) stop[key] = row[key];
  if (month === today.slice(0, 7) && entryStatus(row, today) === "upcoming") stop.upcoming = true;
  // Only a published event page is linked, so nothing points at a draft.
  if (row.event_slug && row.event_status === "published") stop.event = row.event_slug;
  // A photo left undescribed reads as "<title> — photo N" (owner, 2026-10-26: descriptions are optional).
  if (photos.length) stop.photos = photos.map((p, i) => {
    const alt = p.alt?.trim() || `${row.title} — photo ${i + 1}`;
    return p.fit === "contain" ? { src: p.src, alt, fit: "contain" } : { src: p.src, alt };
  });
  return stop;
}
