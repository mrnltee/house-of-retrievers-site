/**
 * Name suggestions on an event's Add registration form (owner feedback, 26 Nov 2026):
 * typing a name lists matching People records and past RSVPs, and picking one fills
 * the email and furbabies (names, breeds, genders, ages) instead of typing them again.
 *
 * Admin only. Contact details never reach the public RSVP form.
 */
import { peopleMatch } from "./people.mjs";
import { agesToday } from "../furbabyAge.mjs";
import { splitFurbabyNames } from "../attendeeNames.mjs";

export const MIN_QUERY = 2;
export const MAX_SUGGESTIONS = 8;
export const MAX_FURBABIES = 10;

/** Trimmed, single-spaced, lower case: how names and emails are compared everywhere else. */
export const normName = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const normEmail = (value) => String(value ?? "").trim().toLowerCase();

/** The typed text, tidied, or "" when too short to search. */
export function cleanQuery(value) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  return text.length >= MIN_QUERY ? text : "";
}

/** A LIKE pattern that matches the text anywhere, with % _ \ taken literally. */
export const likePattern = (text) => `%${String(text).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "Asia/Manila" });
const monthOf = (value) => {
  const d = value ? new Date(String(value).length === 10 ? `${value}T12:00:00+08:00` : value) : null;
  return d && !Number.isNaN(d.getTime()) ? MONTH.format(d) : "";
};

/**
 * One row per furbaby, from a record's comma-separated names and its per-furbaby lists.
 * Furbabies over the rainbow bridge are left out: they won't be coming.
 */
export function furbabiesOf(row, { now = new Date(), agesOn = null } = {}) {
  const names = splitFurbabyNames(row?.furbaby_name);
  const count = Math.min(MAX_FURBABIES, Math.max(names.length, Number(row?.furbaby_count) || 0, (row?.furbaby_breeds || []).filter(Boolean).length));
  const rainbow = row?.furbaby_rainbow || [];
  const ages = agesToday(row?.furbaby_ages || [], agesOn, { rainbow, now }) || [];
  const list = [];
  for (let i = 0; i < count; i += 1) {
    if (rainbow[i]) continue;
    list.push({ name: names[i] || "", breed: row?.furbaby_breeds?.[i] || "", sex: row?.furbaby_sexes?.[i] || "", age: ages[i] || "" });
  }
  return list.filter((f) => f.name || f.breed || f.sex || f.age);
}

const filled = (list) => list.filter((f) => f.breed || f.sex || f.age).length;

/**
 * Suggestions from the People rows and past registrations that matched the query.
 * people: { id, kind, name, email, membership, member_no, member_year, furbaby_name, furbaby_breeds, furbaby_sexes, furbaby_ages, furbaby_ages_on, furbaby_rainbow }
 * registrations: { name, email, furbaby_name, furbaby_count, furbaby_breeds, furbaby_sexes, furbaby_ages, created_at, event_id, event_title, event_date }
 * One suggestion per name + email (a household email can register several people).
 * Each: { key, name, email, label, tone, detail, furbabies, here }, best first:
 * an exact name, then a name that starts with the text, then People records, then the latest RSVP.
 */
export function pastPeopleSuggestions({ query, people = [], registrations = [], eventId = null, now = new Date() } = {}) {
  const q = normName(query);
  if (q.length < MIN_QUERY) return [];
  const groups = new Map();
  const groupOf = (row) => {
    const email = normEmail(row.email);
    const key = `${normName(row.name)}|${email}`;
    if (!normName(row.name) || !email) return null;
    if (!groups.has(key)) groups.set(key, { key, name: String(row.name).trim().replace(/\s+/g, " "), email: String(row.email).trim(), people: [], regs: [] });
    return groups.get(key);
  };
  for (const p of people || []) groupOf(p)?.people.push(p);
  for (const r of registrations || []) groupOf(r)?.regs.push(r);

  const list = [];
  for (const g of groups.values()) {
    const regs = g.regs.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const here = regs.some((r) => eventId && r.event_id === eventId);
    const past = regs.filter((r) => !eventId || r.event_id !== eventId);
    const match = peopleMatch(g.people);
    const last = past[0] || null;
    // Furbabies: the People record when it has them (kept up to date on re-join and Edit details),
    // else the latest RSVP that has more detail than the one before it.
    const fromPerson = match ? furbabiesOf(match.person, { now, agesOn: match.person.furbaby_ages_on }) : [];
    const fromRegs = past.map((r) => furbabiesOf(r, { now, agesOn: r.created_at })).filter((f) => f.length);
    const fromReg = fromRegs.reduce((best, f) => (filled(f) > filled(best) ? f : best), fromRegs[0] || []);
    const furbabies = fromPerson.length ? fromPerson : fromReg;
    const events = new Set(past.map((r) => r.event_id)).size;
    const detail = [
      last ? `Last RSVP: ${last.event_title || "an event"}${monthOf(last.event_date) ? ` · ${monthOf(last.event_date)}` : ""}` : "",
      events > 1 ? `${events} events` : "",
    ].filter(Boolean).join(" · ");
    const name = normName(g.name);
    const rank = name === q ? 0 : name.startsWith(q) || name.split(" ").some((w) => w.startsWith(q)) ? 1 : 2;
    list.push({
      key: g.key,
      name: g.name,
      email: g.email,
      label: match ? match.label : "Past RSVP",
      tone: match?.tone || "",
      detail: detail || (match ? "On People" : ""),
      furbabies,
      here,
      sort: [here ? 1 : 0, rank, match ? 0 : 1, -(Date.parse(last?.created_at) || 0)],
    });
  }
  list.sort((a, b) => {
    for (let i = 0; i < a.sort.length; i += 1) if (a.sort[i] !== b.sort[i]) return a.sort[i] - b.sort[i];
    return a.name.localeCompare(b.name);
  });
  return list.slice(0, MAX_SUGGESTIONS).map(({ sort, ...s }) => s);
}
