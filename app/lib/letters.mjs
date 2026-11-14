/**
 * Letters: HOR's prepared letters (sponsorship, donation, X-Deal, invitations),
 * filled in for a sponsor, partner or person and sent as a PDF with a short
 * covering email. Pure functions only; the PDF is drawn in `letterPdf.mjs`.
 *
 * A letter is written in a light markup (see LETTER_HELP). Anything in
 * [square brackets] is a blank:
 * - [Company Name] is the recipient's name (a sponsor/partner's name, or a
 *   person's organization, else their name) and [Date] is the sending date.
 * - [Something?] is optional: its line is left out when it's empty.
 * - [Proposed: …] is asked for, already filled with the suggestion.
 * - Any other [Label] is asked for once when sending, the same for everyone in
 *   that send.
 */
import { LETTER_STARTERS } from "./letters/starters.mjs";
import { hasSignatureMark, placeSignatureMark } from "./letterSignature.mjs";

export { LETTER_STARTERS };

export const LETTER_LIMITS = { name: 80, subject: 150, cover: 8000, body: 40000, value: 600 };

/** Most recipients per send: keeps one send inside the server's time limit and Resend's pace. */
export const MAX_LETTER_RECIPIENTS = 25;

/** Blanks the system fills by itself. */
export const AUTO_BLANKS = {
  "Company Name": "Who the letter is to: the company, brand or shelter; for a guest with no company, their name",
  // Not "Contact Person": letters use that for HOR's own contact, asked when sending.
  "Their Contact Person": "The representative or contact person on their record (write [Their Contact Person?] to drop the line when there's none)",
  Address: "The address on their record (write [Address?] to drop the line when there's none)",
  Salutation: "How to greet them, e.g. Ms. Jessie: the greeting on their record, else the contact person, else the company",
  Date: "The day the letter is sent, e.g. October 24, 2026",
};

export const LETTER_HELP = [
  "A blank line starts a new paragraph. Lines inside a paragraph stay as written.",
  "**bold**",
  "# Big heading · ## Section heading · ^ centred line · - bullet",
  "{signature} on its own line marks where the signature goes (switch it on under Signature).",
  "Tables: one row per line, cells between | bars; start the first row with |! to make it a header.",
  "---page--- starts a new page.",
];

// A [label](https://…) link in a covering email is not a blank.
const BLANK_RE = /\[([^\]\n]{1,400})\](?!\(https:\/\/)/g;

/** The Manila date for `when`, e.g. "October 24, 2026". */
export function letterDate(when = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" }).format(when);
}

/** Who a letter is addressed to: always the company (owner's decision), else the person. */
export function recipientName({ supporter, person } = {}) {
  if (supporter) return String(supporter.name || "").trim();
  if (person) return String(person.organization || "").trim() || String(person.name || "").trim();
  return "";
}

/** "Apple" → "Apple Team" (owner, 2026-11-06: capital T; a name already ending in "team" is left as it is). */
export const teamOf = (name) => (/\bteam$/i.test(String(name).trim()) ? String(name).trim() : `${String(name).trim()} Team`);

/** How letters greet a brand (owner, 2026-11-02), stored on supporters.greeting. */
export const GREETINGS = [
  ["auto", "Automatic"],
  ["contact", "Contact person"],
  ["team", "Brand team"],
  ["custom", "My own wording"],
];

/** The "Dear ___," for a brand, from its greeting choice. */
export function brandGreeting({ name = "", contactName = "", salutation = "", greeting = "auto" } = {}) {
  const team = name ? teamOf(name) : "";
  if (greeting === "team") return team;
  if (greeting === "contact") return contactName || team;
  return salutation || contactName || team;
}

/**
 * What a recipient's record gives the address block: { name, contact, address, salutation }.
 * Guest list: with a company/brand filled in, the company is [Company Name]
 * and the name is the contact person; without one, the name is both the
 * [Company Name] and the greeting.
 */
export function recipientFields({ supporter, person, contact, beneficiary } = {}) {
  const t = (v) => String(v || "").trim();
  // A brand or organization with no contact person is greeted as its team (owner, 2026-11-02): "Dear Apple team,".
  const org = (name, contactName, salutation) => ({ name, contact: contactName, salutation: salutation || (contactName || !name ? "" : teamOf(name)) });
  if (contact) {
    const company = t(contact.organization) || t(contact.name);
    const who = t(contact.organization) ? t(contact.name) : "";
    // Sponsors and X-Deal partners with only a brand name (no person yet) are greeted as the brand's team.
    const brandOnly = !who && ["sponsor", "partner"].includes(contact.category);
    return { name: company, contact: who, address: t(contact.address), salutation: t(contact.salutation) || (brandOnly && company ? teamOf(company) : "") };
  }
  if (supporter) {
    const name = recipientName({ supporter });
    return { name, contact: t(supporter.contact_name), address: t(supporter.address), salutation: brandGreeting({ name, contactName: t(supporter.contact_name), salutation: t(supporter.salutation), greeting: supporter.greeting }) };
  }
  if (beneficiary) return { ...org(t(beneficiary.name), t(beneficiary.contact_name), t(beneficiary.salutation)), address: t(beneficiary.address) };
  if (person) return { name: recipientName({ person }), contact: t(person.organization) ? t(person.name) : "", address: "", salutation: "" };
  return { name: "", contact: "", address: "", salutation: "" };
}

const isOptional = (label) => label.endsWith("?");
const baseLabel = (label) => label.replace(/\?$/, "").trim();

/**
 * The blanks a sender has to fill, in order of first appearance, across the
 * subject, cover email and letter. Each: { label, optional, suggestion }.
 */
export function blanksOf(...texts) {
  const seen = new Map();
  for (const text of texts) {
    for (const [, raw] of String(text || "").matchAll(BLANK_RE)) {
      const label = raw.trim();
      const base = baseLabel(label);
      if (AUTO_BLANKS[base] || seen.has(base)) continue;
      const suggestion = /^Proposed:\s*/i.test(base) ? base.replace(/^Proposed:\s*/i, "") : "";
      seen.set(base, { label: base, optional: isOptional(label), suggestion });
    }
  }
  return [...seen.values()];
}

/** Values that are missing for required blanks. */
export function missingBlanks(blanks, values = {}) {
  return blanks.filter((b) => !b.optional && !String(values[b.label] ?? "").trim()).map((b) => b.label);
}

/**
 * Fills the blanks. `values` is keyed by label; auto blanks come from `name`
 * and `date`. A line made only of an empty optional blank is dropped.
 */
export function fillLetter(text, { name = "", contact = "", address = "", salutation = "", date = letterDate(), values = {} } = {}, { plain = false } = {}) {
  // In a covering email only the template's own [label](https://…) may become
  // a link; a filled-in name or value (which can come from the public Join
  // form) is kept as plain text by breaking any "](" in it.
  const safe = (v) => (plain ? String(v).replace(/\]\s*\(/g, "] (") : v);
  const value = (label) => {
    const base = baseLabel(label);
    if (base === "Company Name") return safe(name);
    if (base === "Their Contact Person") return safe(contact);
    if (base === "Address") return safe(address);
    if (base === "Salutation") return safe(salutation || contact || name);
    if (base === "Date") return date;
    return safe(String(values[base] ?? "").trim());
  };
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => {
      const only = line.trim().match(/^\[([^\]]+\?)\]$/);
      return !only || value(only[1]) !== "";
    })
    .join("\n")
    .replace(BLANK_RE, (_, label) => value(label))
    .replace(/\n{3,}/g, "\n\n");
}

/** **bold** runs: [{ text, bold }]. */
export function inlineRuns(text) {
  const runs = [];
  const re = /\*\*([\s\S]+?)\*\*/g;
  let last = 0;
  for (const m of String(text).matchAll(re)) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index), bold: false });
    runs.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), bold: false });
  return runs.filter((r) => r.text);
}

/** Table limits, so a letter can't make the PDF drawing run away. */
export const TABLE_LIMITS = { columns: 12, rows: 400 };

/** Cells beyond the column limit are folded into the last cell. */
function capCells(cells) {
  if (cells.length <= TABLE_LIMITS.columns) return cells;
  const keep = cells.slice(0, TABLE_LIMITS.columns - 1);
  return [...keep, cells.slice(TABLE_LIMITS.columns - 1).join(" / ")];
}

const splitRow = (line) => line.replace(/^\|!?\s?/, "").replace(/\s?\|\s*$/, "").split(/\s\|\s/).map((c) => c.trim().replace(/\s*\/\/\s*/g, "\n"));

/**
 * Markup → blocks: { type: "h1" | "h2" | "center" | "p" | "bullet" | "table" | "page", runs?, rows? }.
 * Table rows: { header, cells: [runs, …] }.
 */
export function letterBlocks(text) {
  const blocks = [];
  for (const chunk of String(text || "").replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const block = chunk.replace(/^\n+|\n+$/g, "");
    if (!block.trim()) continue;
    if (block.trim() === "---page---") { blocks.push({ type: "page" }); continue; }
    // Where the signature goes, if the letter has one switched on (letterSignature.mjs).
    if (block.trim() === "{signature}") { blocks.push({ type: "signature" }); continue; }
    const lines = block.split("\n");
    if (lines.every((l) => /^\|/.test(l.trim()))) {
      blocks.push({ type: "table", rows: lines.slice(0, TABLE_LIMITS.rows).map((l) => ({ header: l.trim().startsWith("|!"), cells: capCells(splitRow(l.trim())).map(inlineRuns) })) });
      continue;
    }
    if (lines.every((l) => /^- /.test(l))) {
      for (const l of lines) blocks.push({ type: "bullet", runs: inlineRuns(l.slice(2)) });
      continue;
    }
    const first = lines[0];
    if (first.startsWith("# ")) blocks.push({ type: "h1", runs: inlineRuns(block.slice(2)) });
    else if (first.startsWith("## ")) blocks.push({ type: "h2", runs: inlineRuns(block.slice(3)) });
    else if (first.startsWith("^ ")) blocks.push({ type: "center", runs: inlineRuns(lines.map((l) => l.replace(/^\^ /, "")).join("\n")) });
    else blocks.push({ type: "p", runs: inlineRuns(block) });
  }
  return blocks;
}

/** A letter by key: HOR's saved wording over the starter. `saved` is a DB row or null. */
export function letterWithOverride(key, saved) {
  const starter = LETTER_STARTERS.find((l) => l.key === key);
  if (!starter && !saved) return null;
  const pick = (field) => (saved && typeof saved[field] === "string" && saved[field] ? saved[field] : starter?.[field] || "");
  return { key, name: pick("name"), subject: pick("subject"), cover: pick("cover"), body: pick("body"), signature: saved?.signature || null, invitation: saved?.invitation || null, attachPdf: saved ? saved.attach_pdf !== false : starter?.attachPdf !== false, custom: Boolean(saved), starter: Boolean(starter) };
}

/** Everything one recipient gets: email subject and cover text, and the letter's blocks. */
export function prepareLetter(letter, { name, contact = "", address = "", salutation = "", date = letterDate(), values = {}, signed = false }) {
  const who = { name, contact, address, salutation, date, values };
  const fill = (t) => fillLetter(t, who);
  return {
    subject: fill(letter.subject).replace(/\s+/g, " ").trim(),
    cover: fillLetter(letter.cover, who, { plain: true }),
    // A signature that is on but has no {signature} line still gets a place (letterSignature.mjs).
    blocks: letterBlocks(signed && !hasSignatureMark(letter.body) ? placeSignatureMark(fill(letter.body)) : fill(letter.body)),
    filename: `HOR ${letter.name.replace(/[^\w ()&,.–—-]+/g, "").trim()}${name ? ` – ${name.replace(/[^\w ()&,.-]+/g, "").trim()}` : ""}.pdf`.slice(0, 140),
  };
}

/**
 * Each blank's value for a letter preview or PDF, in order of precedence:
 * `forced` (Payment settings' bank and GCash), what was typed on the send page,
 * `known` answers (standard details, the event's fill-ins), then, in the
 * editor, the blank's sample. So the PDF matches the page view.
 */
export function letterValues(blanks = [], { forced = {}, typed = {}, known = {}, sample = false } = {}) {
  const pick = (...vals) => vals.map((v) => String(v ?? "").trim()).find(Boolean) || "";
  return Object.fromEntries(blanks.map((b) => [b.label, pick(forced[b.label], typed[b.label], known[b.label], sample ? b.suggestion || `[${b.label}]` : "").slice(0, LETTER_LIMITS.value)]));
}

/**
 * Wording edited on the send page for one send (owner, 2026-11-06): for one brand
 * (byRef) or for all brands in the send (all). The saved letter is unchanged.
 */
export function wordingFor(letter, edits, ref) {
  const e = edits?.byRef?.[ref] || edits?.all || null;
  return e ? { ...letter, subject: e.subject, cover: e.cover, body: e.body ?? letter.body, edited: true } : letter;
}

/** The send page's edits (JSON) → { edits: { all, byRef } } or { error }; only refs in this send are kept. */
export function cleanEdits(json, refs = []) {
  if (!String(json || "").trim()) return { edits: { all: null, byRef: {} } };
  let raw;
  try { raw = JSON.parse(json); } catch { return { error: "The edited wording didn't come through. Reload and try again." }; }
  const one = (w) => {
    if (!w || typeof w !== "object") return { wording: null };
    const subject = String(w.subject ?? "").replace(/\s+/g, " ").trim();
    const cover = String(w.cover ?? "").replace(/\r\n?/g, "\n").trim();
    const body = w.body == null ? undefined : String(w.body).replace(/\r\n?/g, "\n").trim();
    if (!subject) return { error: "An edited subject can't be empty." };
    if (subject.length > LETTER_LIMITS.subject) return { error: "An edited subject is too long." };
    if (!cover) return { error: "An edited email text can't be empty." };
    if (cover.length > LETTER_LIMITS.cover) return { error: `An edited email text is too long (${LETTER_LIMITS.cover.toLocaleString("en-PH")} characters at most).` };
    if (body !== undefined && (!body || body.length > LETTER_LIMITS.body)) return { error: "An edited letter text is empty or too long." };
    return { wording: { subject, cover, ...(body !== undefined ? { body } : {}) } };
  };
  const all = one(raw.all);
  if (all.error) return all;
  const byRef = {};
  for (const [ref, w] of Object.entries(raw.byRef || {})) {
    if (!refs.includes(ref)) continue;
    const r = one(w);
    if (r.error) return r;
    if (r.wording) byRef[ref] = r.wording;
  }
  return { edits: { all: all.wording, byRef } };
}

/** Several blank lists → one, first appearance wins. */
export function unionBlanks(lists) {
  const seen = new Map();
  for (const list of lists) for (const b of list) if (!seen.has(b.label)) seen.set(b.label, b);
  return [...seen.values()];
}
