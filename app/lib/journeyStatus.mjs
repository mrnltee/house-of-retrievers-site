/**
 * Past or upcoming for a timeline entry (app/content/journey.js).
 * Earlier months are past and later months upcoming, whatever the entry
 * says; within the current month the entry's own `upcoming` flag decides.
 */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "YYYY-MM" for a moment, in Manila. */
export function manilaMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}`;
}

/** @returns {"past" | "upcoming"} */
export function stopStatus(stop, current = manilaMonth()) {
  if (!stop.month) return "upcoming";
  if (stop.month < current) return "past";
  if (stop.month > current) return "upcoming";
  return stop.upcoming ? "upcoming" : "past";
}

/** "2026-05" → "May 2026" */
export function monthLabel(month) {
  const [year, m] = month.split("-");
  return `${MONTHS[Number(m) - 1]} ${year}`;
}

/** Fills `[ … {org} … ]` once the registered name is released, else drops it, and ends the sentence once. */
export function withOrg(text, org) {
  const filled = text.replace(/\[([^\]]*)\]/g, (_, inner) => (org ? inner.replace("{org}", org) : ""));
  return /[.!?]$/.test(filled) ? filled : `${filled}.`;
}
