/**
 * Repeating events (7 Nov 2026, owner): "Every [first … last] [weekday] of
 * [the month | a month]". Every month gives a monthly event (e.g. the last
 * Sunday playdate); a named month gives a yearly one (e.g. the second
 * Saturday of March). Each date becomes its own event, so RSVPs, payments and
 * check-in stay per date; the rule is kept on each so the admin can show it.
 * Calendar dates only (YYYY-MM-DD), so no time zone can shift a day.
 */

/** @typedef {{ nth: 1 | 2 | 3 | 4 | -1, weekday: number, month: number }} RepeatRule  month 0 = every month */

export const NTH_OPTIONS = [
  { value: 1, label: "first" },
  { value: 2, label: "second" },
  { value: 3, label: "third" },
  { value: 4, label: "fourth" },
  { value: -1, label: "last" },
];
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** How many dates are set up at once, as separate draft events. */
export const REPEAT_COUNT_DEFAULT = 3;
export const REPEAT_COUNT_MAX = 12;
export const cleanRepeatCount = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) ? Math.min(Math.max(n, 1), REPEAT_COUNT_MAX) : REPEAT_COUNT_DEFAULT;
};

const int = (v) => (typeof v === "number" ? v : Number.parseInt(v, 10));

/** A valid rule, or null. */
export function cleanRule(input) {
  if (!input || typeof input !== "object") return null;
  const nth = int(input.nth);
  const weekday = int(input.weekday);
  const month = int(input.month ?? 0);
  if (!NTH_OPTIONS.some((o) => o.value === nth)) return null;
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  if (!Number.isInteger(month) || month < 0 || month > 12) return null;
  return { nth, weekday, month };
}

const pad = (n) => String(n).padStart(2, "0");

/** The nth (or last, -1) weekday of a month (1–12) as YYYY-MM-DD. */
export function nthWeekdayOf(year, month, nth, weekday) {
  if (nth === -1) {
    const last = new Date(Date.UTC(year, month, 0));
    const back = (last.getUTCDay() - weekday + 7) % 7;
    return `${year}-${pad(month)}-${pad(last.getUTCDate() - back)}`;
  }
  const first = new Date(Date.UTC(year, month - 1, 1));
  const day = 1 + ((weekday - first.getUTCDay() + 7) % 7) + (nth - 1) * 7;
  return `${year}-${pad(month)}-${pad(day)}`; // nth is 1–4, so the day always exists
}

/** The next `count` dates of a rule, on or after `from` (YYYY-MM-DD). */
export function occurrences(rule, from, count) {
  const r = cleanRule(rule);
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(from || "");
  if (!r || !m || count < 1) return [];
  let year = Number(m[1]);
  let month = r.month || Number(m[2]);
  const out = [];
  for (let guard = 0; out.length < count && guard < 600; guard += 1) {
    const date = nthWeekdayOf(year, month, r.nth, r.weekday);
    if (date >= from) out.push(date);
    if (r.month) year += 1;
    else if (month === 12) { month = 1; year += 1; } else month += 1;
  }
  return out;
}

/** "Every last Sunday of the month" / "Every second Saturday of March". */
export function describeRule(rule) {
  const r = cleanRule(rule);
  if (!r) return "";
  const nth = NTH_OPTIONS.find((o) => o.value === r.nth).label;
  return `Every ${nth} ${WEEKDAYS[r.weekday]} of ${r.month ? MONTHS[r.month - 1] : "the month"}`;
}
