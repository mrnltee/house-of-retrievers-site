/**
 * Invitation cards (owner, 2026-11-11): a letter can send a personalised card
 * instead of a typed letter. HOR uploads the blank card art (4:5) and up to
 * three more pages (Attire, Beneficiaries…); each guest's name is written on
 * the card in gold script with their organization under it. Pure functions.
 */
import { splitFurbabyNames } from "./attendeeNames.mjs";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const MAX_INVITATION_PAGES = 3;
export const INVITATION_LIMITS = { y: [0.1, 0.95], nameSize: [36, 120], orgSize: [16, 48], name: 60, org: 80 };
export const INVITATION_DEFAULT = { on: false, card: "", pages: [], y: 0.84, nameSize: 72, orgSize: 28 };
/** Gold as on HOR's cards, and the white of its organization line. */
export const CARD_GOLD = "#C9A04E";
export const CARD_WHITE = "#FFFFFF";

const OWN_IMAGE = /^\/api\/event-image\/[0-9a-f-]{36}$/;
const clamp = (value, [lo, hi], fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

/** Any stored or posted settings → clean settings. */
export function cleanInvitation(input) {
  const s = input && typeof input === "object" ? input : {};
  const pages = (Array.isArray(s.pages) ? s.pages : []).filter((p) => OWN_IMAGE.test(String(p || ""))).slice(0, MAX_INVITATION_PAGES);
  return {
    on: s.on === true || s.on === "on" || s.on === "true" || s.on === "1",
    card: OWN_IMAGE.test(String(s.card || "")) ? s.card : "",
    pages,
    y: Math.round(clamp(s.y, INVITATION_LIMITS.y, INVITATION_DEFAULT.y) * 1000) / 1000,
    nameSize: Math.round(clamp(s.nameSize, INVITATION_LIMITS.nameSize, INVITATION_DEFAULT.nameSize)),
    orgSize: Math.round(clamp(s.orgSize, INVITATION_LIMITS.orgSize, INVITATION_DEFAULT.orgSize)),
  };
}

/** Is this letter sent as an invitation card (on, with card art)? */
export const isInvitation = (settings) => {
  const s = cleanInvitation(settings);
  return s.on && Boolean(s.card);
};

const tidy = (text, max) => String(text ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * The name and organization written on a guest's card. From the record: the
 * contact person, with the company under it; with no contact person, the name
 * alone. `override` ({ name, org }) is what was typed on the send page for this
 * guest; an org typed empty (with a name typed) leaves the line off.
 */
export function cardNames(recipient = {}, override = null) {
  const contact = tidy(recipient.contact, INVITATION_LIMITS.name);
  const name = tidy(recipient.name, INVITATION_LIMITS.org);
  // A registered participant's line is set by the record (their furbabies, cardLine).
  const fromRecord = typeof recipient.cardLine === "string" ? { name: tidy(contact || name, INVITATION_LIMITS.name), org: tidy(recipient.cardLine, INVITATION_LIMITS.org) }
    : contact ? { name: contact, org: name } : { name: tidy(name, INVITATION_LIMITS.name), org: "" };
  if (!override || typeof override !== "object") return fromRecord;
  const typedName = tidy(override.name, INVITATION_LIMITS.name);
  return { name: typedName || fromRecord.name, org: "org" in override ? tidy(override.org, INVITATION_LIMITS.org) : fromRecord.org };
}

/** The send page's per-guest names (JSON) → { byRef: { ref: { name, org } } }; only refs in this send. */
export function readCardNames(json, refs = []) {
  let raw = {};
  try { raw = JSON.parse(String(json || "") || "{}"); } catch { raw = {}; }
  const byRef = {};
  for (const ref of refs) {
    const v = raw?.[ref];
    if (v && typeof v === "object") byRef[ref] = { name: tidy(v.name, INVITATION_LIMITS.name), org: tidy(v.org, INVITATION_LIMITS.org) };
  }
  return { byRef };
}

/** Where the name and organization lines sit, in pixels on the 1080 × 1350 card. */
export function cardLayout(settings, { org = "" } = {}) {
  const s = cleanInvitation(settings);
  const nameBaseline = Math.round(s.y * CARD_HEIGHT);
  return { nameBaseline, nameSize: s.nameSize, orgBaseline: org ? Math.round(nameBaseline + s.orgSize * 1.55) : null, orgSize: s.orgSize };
}

/**
 * The recipient as the email addresses them: a name typed for the card (owner,
 * 2026-11-11) is also who the note greets ("Dear Hon. Juan Miguel Zubiri,").
 */
export function withCardName(recipient = {}, override = null) {
  const typed = tidy(override?.name, INVITATION_LIMITS.name);
  return typed ? { ...recipient, contact: typed, salutation: typed } : recipient;
}

/**
 * The line under a registered participant's name (owner, 2026-11-11): their
 * furbabies, "& Mochi", "& Mochi and Fudge", "& Mochi, Fudge and Bean"; empty
 * for a hooman-only registration.
 */
export function furbabyCardLine(furbabyName) {
  const names = splitFurbabyNames(furbabyName);
  if (!names.length) return "";
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return tidy(`& ${list}`, INVITATION_LIMITS.org);
}
