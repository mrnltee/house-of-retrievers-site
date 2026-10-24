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

export { LETTER_STARTERS };

export const LETTER_LIMITS = { name: 80, subject: 150, cover: 2000, body: 40000, value: 600 };

/** Most recipients per send: keeps one send inside the server's time limit and Resend's pace. */
export const MAX_LETTER_RECIPIENTS = 25;

/** Blanks the system fills by itself. */
export const AUTO_BLANKS = {
  "Company Name": "The sponsor or partner's name (for People: their organization, else their name)",
  Date: "The day the letter is sent, e.g. October 24, 2026",
};

export const LETTER_HELP = [
  "A blank line starts a new paragraph. Lines inside a paragraph stay as written.",
  "**bold**",
  "# Big heading · ## Section heading · ^ centred line · - bullet",
  "Tables: one row per line, cells between | bars; start the first row with |! to make it a header.",
  "---page--- starts a new page.",
];

const BLANK_RE = /\[([^\]\n]{1,400})\]/g;

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
export function fillLetter(text, { name = "", date = letterDate(), values = {} } = {}) {
  const value = (label) => {
    const base = baseLabel(label);
    if (base === "Company Name") return name;
    if (base === "Date") return date;
    return String(values[base] ?? "").trim();
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
    const lines = block.split("\n");
    if (lines.every((l) => /^\|/.test(l.trim()))) {
      blocks.push({ type: "table", rows: lines.map((l) => ({ header: l.trim().startsWith("|!"), cells: splitRow(l.trim()).map(inlineRuns) })) });
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
  return { key, name: pick("name"), subject: pick("subject"), cover: pick("cover"), body: pick("body"), custom: Boolean(saved), starter: Boolean(starter) };
}

/** Everything one recipient gets: email subject and cover text, and the letter's blocks. */
export function prepareLetter(letter, { name, date = letterDate(), values = {} }) {
  const fill = (t) => fillLetter(t, { name, date, values });
  return {
    subject: fill(letter.subject).replace(/\s+/g, " ").trim(),
    cover: fill(letter.cover),
    blocks: letterBlocks(fill(letter.body)),
    filename: `HOR ${letter.name.replace(/[^\w ()&,.–—-]+/g, "").trim()}${name ? ` – ${name.replace(/[^\w ()&,.-]+/g, "").trim()}` : ""}.pdf`.slice(0, 140),
  };
}
