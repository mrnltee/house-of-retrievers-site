/**
 * Brands per event (owner, 2026-11-01): Brands & Partners is a directory;
 * each event's Brand tracker records who was invited, their reply and what
 * they're giving for that event only. Pure functions, so they can be tested.
 */
import { GIVES } from "./supporters.mjs";

export const REPLIES = [
  ["waiting", "No reply yet"],
  ["yes", "Yes"],
  ["no", "No"],
];
export const ROLES = ["Partner", "Sponsor"];
export const replyLabel = (key) => REPLIES.find(([k]) => k === key)?.[1] || "No reply yet";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (value, max) => String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max) || null;
const on = (v) => v === true || v === "on" || v === "true";

/** "1,500" → 1500; "" → null; anything else → NaN (an error). */
function pesos(value) {
  const t = String(value ?? "").replace(/[₱,\s]/g, "");
  if (!t) return null;
  return /^\d+$/.test(t) ? Number(t) : NaN;
}
function heads(value) {
  const t = String(value ?? "").trim();
  if (!t) return null;
  return /^\d+$/.test(t) && Number(t) <= 500 ? Number(t) : NaN;
}

/** Tracker row form → { value } or { error }. */
export function cleanEventBrand(input = {}) {
  const role = ROLES.includes(input.role) ? input.role : null;
  if (!role) return { error: "Pick Partner or Sponsor for this event." };
  const reply = REPLIES.some(([k]) => k === input.reply) ? input.reply : "waiting";
  const followUpOn = String(input.followUpOn ?? "").trim() || null;
  if (followUpOn && !DATE.test(followUpOn)) return { error: "The follow-up date doesn't look right." };
  const cashAmount = pesos(input.cashAmount);
  const inKindValue = pesos(input.inKindValue);
  if (Number.isNaN(cashAmount) || Number.isNaN(inKindValue)) return { error: "Amounts should be whole pesos, like 5000." };
  const repsAttending = heads(input.repsAttending);
  const dogsAttending = heads(input.dogsAttending);
  if (Number.isNaN(repsAttending) || Number.isNaN(dogsAttending)) return { error: "People and dogs attending should be whole numbers, like 2." };
  const keys = GIVES.map(([k]) => k);
  const gives = [...new Set([].concat(input.gives ?? []).filter((g) => keys.includes(g)))];
  return {
    value: {
      role, reply, followUpOn, gives, cashAmount, inKindValue,
      inKindNote: text(input.inKindNote, 300),
      boothNeeds: text(input.boothNeeds, 500),
      repsAttending, dogsAttending,
      showAmounts: on(input.showAmounts),
      notes: text(input.notes, 2000),
    },
  };
}

/** The Brand Tracker sheet's RSVP → this event's reply. */
export const trackerReply = (rsvp) => (rsvp === "confirmed" ? "yes" : rsvp === "declined" ? "no" : "waiting");

export function trackerCounts(rows = []) {
  const n = (r) => rows.filter((x) => x.reply === r).length;
  return { invited: rows.length, yes: n("yes"), no: n("no"), waiting: n("waiting") };
}

/**
 * Names an event shows publicly for one role: brands that said Yes, then names
 * typed into the event that aren't directory brands (those are owned by the tracker).
 */
export function publicNames(arrayNames = [], yesNames = [], directoryNames = []) {
  const key = (n) => String(n || "").trim().toLowerCase();
  const directory = new Set(directoryNames.map(key));
  const out = [];
  const seen = new Set();
  for (const name of [...yesNames, ...arrayNames.filter((n) => !directory.has(key(n)))]) {
    const k = key(name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(String(name).trim());
  }
  return out;
}

/** When the Brand trackers can't be read: no brand names at all, never unchecked ones (a "No" must not show). */
export const withoutBrands = (row) => ({ ...row, partners: [], sponsors: [] });

/** Brand tracker sort choices (remembered in the tracker_sort cookie). */
export const TRACKER_SORTS = [
  ["name", "Name A–Z"],
  ["name-desc", "Name Z–A"],
  ["sent-new", "Sent: newest first"],
  ["sent-old", "Sent: oldest first"],
  ["reply", "Reply: yes, waiting, no"],
];
export const trackerSort = (value) => (TRACKER_SORTS.some(([k]) => k === value) ? value : "name");

/**
 * Orders tracker rows. `sentAt(row)` gives the latest letter time (Date, string or null);
 * rows never sent go last for both "sent" orders. Ties fall back to name A–Z.
 */
export function sortTracker(rows = [], sort = "name", sentAt = () => null) {
  const name = (r) => String(r.name || "").toLocaleLowerCase("en");
  const byName = (a, b) => name(a).localeCompare(name(b), "en");
  const time = (r) => { const t = sentAt(r); return t ? new Date(t).getTime() : null; };
  const replyRank = { yes: 0, waiting: 1, no: 2 };
  const pick = {
    name: byName,
    "name-desc": (a, b) => byName(b, a),
    "sent-new": (a, b) => (time(a) == null) - (time(b) == null) || (time(b) ?? 0) - (time(a) ?? 0) || byName(a, b),
    "sent-old": (a, b) => (time(a) == null) - (time(b) == null) || (time(a) ?? 0) - (time(b) ?? 0) || byName(a, b),
    reply: (a, b) => (replyRank[a.reply] ?? 1) - (replyRank[b.reply] ?? 1) || byName(a, b),
  }[trackerSort(sort)];
  return [...rows].sort(pick);
}
