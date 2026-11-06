/**
 * Event types (7 Nov 2026, owner). `standard` is the existing kind of event
 * (fundraising / charity, with beneficiaries, a guest list and letters). The
 * two playdate types are just a social activity for pets and their people:
 * no beneficiaries, no guest list, and the people who sign up are called
 * Participants. `monthly_playdate` repeats on the last Sunday of each month.
 */

/** @typedef {"standard" | "playdate" | "monthly_playdate"} EventType */

export const EVENT_TYPES = [
  { key: "standard", label: "Fundraiser or charity event", hint: "Raises money or supports beneficiaries. Has a guest list, donors and letters." },
  { key: "playdate", label: "Playdate", hint: "A one-off social activity for pets and their people. No fundraising." },
  { key: "monthly_playdate", label: "Monthly playdate", hint: "A playdate every last Sunday of the month. Saving it also sets up the next months as drafts." },
];

const KEYS = EVENT_TYPES.map((t) => t.key);

/** @returns {EventType} */
export const cleanEventType = (value) => (KEYS.includes(value) ? value : "standard");

/** Playdates are social, not fundraising. */
export const isSocialType = (type) => type === "playdate" || type === "monthly_playdate";
export const isMonthlyType = (type) => type === "monthly_playdate";

/** The guest list is for fundraising and charity events only. */
export const showsGuestList = (type) => !isSocialType(type);

/** What the people who sign up are called. */
export const participantsLabel = (type) => (isSocialType(type) ? "Participants" : "RSVPs");

export const eventTypeLabel = (type) => EVENT_TYPES.find((t) => t.key === type)?.label || EVENT_TYPES[0].label;

/** How many later months are set up as drafts when a monthly playdate is created. */
export const MONTHLY_AHEAD_DEFAULT = 3;
export const MONTHLY_AHEAD_MAX = 12;
export const cleanMonthsAhead = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) ? Math.min(Math.max(n, 1), MONTHLY_AHEAD_MAX) : MONTHLY_AHEAD_DEFAULT;
};

const pad = (n) => String(n).padStart(2, "0");

/** The last Sunday of a month (month 1–12) as YYYY-MM-DD. Calendar dates only, so no time zone can shift it. */
export function lastSundayOf(year, month) {
  const last = new Date(Date.UTC(year, month, 0)); // day 0 of the next month = last day of this one
  const back = last.getUTCDay(); // Sunday is 0
  return `${year}-${pad(month)}-${pad(last.getUTCDate() - back)}`;
}

const parts = (date) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : null;
};

/** The last Sunday of the month a date falls in, or null for a bad date. */
export function snapToLastSunday(date) {
  const p = parts(date);
  return p ? lastSundayOf(p.year, p.month) : null;
}

export const isLastSunday = (date) => Boolean(date) && snapToLastSunday(date) === date;

/** The last Sundays of the `count` months after the one `date` falls in. */
export function nextLastSundays(date, count) {
  const p = parts(date);
  if (!p) return [];
  const out = [];
  let { year, month } = p;
  for (let i = 0; i < count; i += 1) {
    month += 1;
    if (month > 12) { month = 1; year += 1; }
    out.push(lastSundayOf(year, month));
  }
  return out;
}
