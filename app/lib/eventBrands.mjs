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

/** What kind of partner a brand is at one event (owner, 2026-11-18). Sponsors have none. */
export const PARTNER_TYPES = [
  ["co-presenter", "Co-presenter", "Presents the event with HoR"],
  ["in-kind", "In-kind partner", "Gives products or services instead of cash"],
  ["exhibitor", "Exhibitor", "Has a booth or table at the event"],
];
export const partnerTypeLabel = (key) => PARTNER_TYPES.find(([k]) => k === key)?.[1] || "";

/**
 * A sponsor's level at one event (owner, 2026-11-18), listed in this order on the event page. Partners have none.
 * The rule that keeps the two apart: partners give work or presence (co-present, exhibit, provide services),
 * sponsors give money or goods; what they give is recorded under Giving.
 */
export const SPONSOR_LEVELS = [
  ["presenting", "Presenting sponsor", "Top billing; named with the event"],
  ["major", "Major sponsor", "A large share of the funding or goods"],
  ["supporting", "Supporting sponsor", "Helps with a smaller amount or items"],
];
export const sponsorLevelLabel = (key) => SPONSOR_LEVELS.find(([k]) => k === key)?.[1] || "";

/** The tracker's "At this event as" choices: one select for role and its category ("Partner:exhibitor", "Sponsor:major"). */
export const ROLE_CHOICES = [
  ["Partner", "Partner"],
  ...PARTNER_TYPES.map(([k, l]) => [`Partner:${k}`, `Partner · ${l}`]),
  ["Sponsor", "Sponsor"],
  ...SPONSOR_LEVELS.map(([k, l]) => [`Sponsor:${k}`, `Sponsor · ${l}`]),
];
/** A row's category at this event: the partner type for a partner, the sponsor level for a sponsor. */
export const categoryLabel = (row = {}) => (row.role === "Sponsor" ? sponsorLevelLabel(row.sponsor_level) : partnerTypeLabel(row.partner_type));
export function roleChoice(row = {}) {
  if (row.role === "Sponsor") return sponsorLevelLabel(row.sponsor_level) ? `Sponsor:${row.sponsor_level}` : "Sponsor";
  return partnerTypeLabel(row.partner_type) ? `Partner:${row.partner_type}` : row.role || "Partner";
}
/** "Exhibitor", "Major sponsor", "Partner", "Sponsor": how a brand's role at one event reads. */
export const roleLabel = (row = {}) => categoryLabel(row) || row.role || "Partner";

/**
 * An event page's partners grouped by their classification, for "With thanks to": co-presenters, then partners
 * with no classification (and names typed into the event), in-kind partners, exhibitors. Empty groups are left out.
 * `types` is { lower-case name → partner type }.
 */
export function partnerGroups(partners = [], types = {}) {
  const groups = [
    { key: "co-presenter", title: "Co-presented with" },
    { key: "", title: "In partnership with" },
    { key: "in-kind", title: "In-kind partners" },
    { key: "exhibitor", title: "Exhibitors" },
  ];
  const typeOf = (name) => { const t = types[String(name).toLowerCase()]; return PARTNER_TYPES.some(([k]) => k === t) ? t : ""; };
  return groups.map((g) => ({ ...g, names: partners.filter((n) => typeOf(n) === g.key) })).filter((g) => g.names.length);
}

/**
 * An event page's sponsors grouped by level, for "With thanks to": presenting, major, supporting, then
 * sponsors with no level (and names typed into the event) under "Sponsored by". Empty groups are left out.
 * `levels` is { lower-case name → sponsor level }.
 */
export function sponsorGroups(sponsors = [], levels = {}) {
  const groups = [
    { key: "presenting", title: "Presenting sponsors" },
    { key: "major", title: "Major sponsors" },
    { key: "supporting", title: "Supporting sponsors" },
    { key: "", title: "Sponsored by" },
  ];
  const levelOf = (name) => { const l = levels[String(name).toLowerCase()]; return SPONSOR_LEVELS.some(([k]) => k === l) ? l : ""; };
  return groups.map((g) => ({ ...g, names: sponsors.filter((n) => levelOf(n) === g.key) })).filter((g) => g.names.length);
}

/** "Partner:exhibitor" → { role: "Partner", partnerType: "exhibitor", sponsorLevel: null }; anything unknown → { role: null }. */
export function readRole(value) {
  const [role, type = ""] = String(value ?? "").split(":");
  if (!ROLES.includes(role)) return { role: null, partnerType: null, sponsorLevel: null };
  const partnerType = role === "Partner" && PARTNER_TYPES.some(([k]) => k === type) ? type : null;
  const sponsorLevel = role === "Sponsor" && SPONSOR_LEVELS.some(([k]) => k === type) ? type : null;
  return { role, partnerType, sponsorLevel };
}
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
  const { role, partnerType, sponsorLevel } = readRole(input.role);
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
      role, partnerType, sponsorLevel, reply, followUpOn, gives, cashAmount, inKindValue,
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
/** The Guest tracker's sorts (owner, 18 Nov 2026): the tracker's, plus by group (category order), then name. */
export const GUEST_SORTS = [...TRACKER_SORTS, ["group", "Group, then name"]];
export const trackerSort = (value, sorts = TRACKER_SORTS) => (sorts.some(([k]) => k === value) ? value : "name");

/**
 * Orders tracker rows. `sentAt(row)` gives the latest letter time (Date, string or null);
 * rows never sent go last for both "sent" orders. Ties fall back to name A–Z.
 */
export function sortTracker(rows = [], sort = "name", sentAt = () => null, { groupRank = () => 0 } = {}) {
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
    group: (a, b) => groupRank(a) - groupRank(b) || byName(a, b),
  }[trackerSort(sort, GUEST_SORTS)];
  return [...rows].sort(pick);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Most events one save may add a brand to. */
export const MAX_EVENT_PICKS = 20;

/**
 * "Add to events" on a brand (owner, 2026-11-14): the events a brand can be
 * added to, split by Manila `today` (YYYY-MM-DD). Upcoming soonest first, past
 * newest first, so the likely pick is at the top of each group.
 */
export function eventChoiceGroups(events = [], today) {
  const day = (e) => String(e.date || "").slice(0, 10);
  const upcoming = events.filter((e) => day(e) >= today).sort((a, b) => day(a).localeCompare(day(b)));
  const past = events.filter((e) => day(e) < today).sort((a, b) => day(b).localeCompare(day(a)));
  return { upcoming, past };
}

/** The ticked events and the reply for them → { ids, reply } (unknown reply = No reply yet). */
export function cleanEventPicks(ids = [], reply = "waiting") {
  const clean = [...new Set([].concat(ids ?? []).filter((id) => typeof id === "string" && UUID.test(id)))].slice(0, MAX_EVENT_PICKS);
  return { ids: clean, reply: REPLIES.some(([k]) => k === reply) ? reply : "waiting" };
}

/** The built-in follow-up email for brands that haven't replied (owner, 2026-11-14). */
export const FOLLOW_UP_LETTER = "brand-follow-up";

/**
 * Brand tracker "Follow up": the send window's address for this event's brands
 * still on No reply yet, with the follow-up email chosen. Returns
 * { href, count, noEmail } (href "" when nobody is waiting).
 */
export function followUpLink(base, eventId, rows = []) {
  const waiting = rows.filter((r) => r.reply === "waiting");
  if (!waiting.length) return { href: "", count: 0, noEmail: 0 };
  const params = new URLSearchParams([["letter", FOLLOW_UP_LETTER], ["event", eventId], ["list", "brands"]]);
  for (const r of waiting) params.append("to", `supporter:${r.supporter_id}`);
  return { href: `${base}/letters/send?${params}`, count: waiting.length, noEmail: waiting.filter((r) => !r.contact_email).length };
}

/**
 * One brand's own buttons on the Brand tracker (owner, 2026-11-15), so a single
 * letter doesn't need a tick first (ticks are for sending to several at once).
 * `send` opens the send window with `letter` for just this brand; `followUp`
 * opens it with the follow-up email, only while they're on No reply yet and an
 * invite has already gone out (`sent`), since the email follows up on it.
 */
export function rowLetterLinks(base, eventId, row, letter, { sent = false } = {}) {
  const href = (key) => `${base}/letters/send?${new URLSearchParams([["letter", key], ["event", eventId], ["list", "brands"], ["to", `supporter:${row.supporter_id}`]])}`;
  return { send: href(letter), followUp: row.reply === "waiting" && sent ? href(FOLLOW_UP_LETTER) : "" };
}

/**
 * The Brand tracker's Partners / Sponsors dropdown (owner, 18 Nov 2026). A row's keys go in data-group,
 * space-separated: "partner partner:exhibitor", "partner partner:none", "sponsor sponsor:major"…; the dropdown
 * picks one key, so "Partners" shows every partner and "Partners · Exhibitor" only those.
 */
export function brandGroupKeys(row = {}) {
  if (row.role === "Sponsor") return ["sponsor", `sponsor:${sponsorLevelLabel(row.sponsor_level) ? row.sponsor_level : "none"}`];
  return ["partner", `partner:${partnerTypeLabel(row.partner_type) ? row.partner_type : "none"}`];
}

/** [[key, label, count]]: Partners and each classification in use, then Sponsors and each level in use. */
export function brandGroups(rows = []) {
  const partners = rows.filter((r) => r.role !== "Sponsor");
  const sponsors = rows.length - partners.length;
  const out = [];
  if (partners.length) {
    out.push(["partner", "Partners", partners.length]);
    const types = [...PARTNER_TYPES.map(([k, l]) => [k, `Partners · ${l}`]), ["none", "Partners · no category yet"]];
    const used = types.map(([k, l]) => [`partner:${k}`, l, partners.filter((r) => brandGroupKeys(r)[1] === `partner:${k}`).length]).filter(([, , n]) => n);
    // One category covering every partner would only repeat the Partners line.
    if (!(used.length === 1 && used[0][2] === partners.length)) out.push(...used);
  }
  if (sponsors) {
    const list = rows.filter((r) => r.role === "Sponsor");
    out.push(["sponsor", "Sponsors", sponsors]);
    const levels = [...SPONSOR_LEVELS.map(([k, l]) => [k, `Sponsors · ${l}`]), ["none", "Sponsors · no level yet"]];
    const used = levels.map(([k, l]) => [`sponsor:${k}`, l, list.filter((r) => brandGroupKeys(r)[1] === `sponsor:${k}`).length]).filter(([, , n]) => n);
    if (!(used.length === 1 && used[0][2] === sponsors)) out.push(...used);
  }
  return out;
}
