/**
 * The letter editor's formatting buttons (owner, 2026-10-31): each writes the
 * same marks the letter already understands (**bold**, # heading, ^ centred,
 * - bullet, | table |, ---page---), so nothing about the PDF changes.
 * Pure: (text, selection start, end) → { text, start, end } for the new selection.
 */
const lineStart = (text, i) => text.lastIndexOf("\n", i - 1) + 1;
const lineEnd = (text, i) => { const n = text.indexOf("\n", i); return n === -1 ? text.length : n; };

/** Wraps the selection in marks; on an already wrapped selection, unwraps it. */
function wrap(text, start, end, before, after = before, placeholder = "text") {
  const picked = text.slice(start, end);
  if (picked && text.slice(start - before.length, start) === before && text.slice(end, end + after.length) === after) {
    return { text: text.slice(0, start - before.length) + picked + text.slice(end + after.length), start: start - before.length, end: end - before.length };
  }
  const inner = picked || placeholder;
  return { text: text.slice(0, start) + before + inner + after + text.slice(end), start: start + before.length, end: start + before.length + inner.length };
}

/** Gives every selected line a prefix, swapping any other line mark; the same prefix again removes it. */
function prefixLines(text, start, end, prefix) {
  const from = lineStart(text, start);
  const to = lineEnd(text, Math.max(start, end - (end > start && text[end - 1] === "\n" ? 1 : 0)));
  const lines = text.slice(from, to).split("\n");
  const marks = /^(## |# |\^ |- )/;
  const all = lines.every((l) => l.startsWith(prefix));
  const next = lines.map((l) => (all ? l.slice(prefix.length) : prefix + l.replace(marks, ""))).join("\n");
  return { text: text.slice(0, from) + next + text.slice(to), start: from, end: from + next.length };
}

/** Puts a block on its own lines, with a blank line before and after. */
function insertBlock(text, start, end, block) {
  const before = text.slice(0, start).replace(/\n*$/, "");
  const after = text.slice(end).replace(/^\n*/, "");
  const head = before ? `${before}\n\n` : "";
  const out = head + block + (after ? `\n\n${after}` : "\n");
  return { text: out, start: head.length, end: head.length + block.length };
}

export const FORMATS = {
  bold: { label: "B", title: "Bold", run: (t, s, e) => wrap(t, s, e, "**") },
  h1: { label: "H1", title: "Big heading", run: (t, s, e) => prefixLines(t, s, e, "# ") },
  h2: { label: "H2", title: "Section heading", run: (t, s, e) => prefixLines(t, s, e, "## ") },
  center: { label: "Centre", title: "Centre the line", run: (t, s, e) => prefixLines(t, s, e, "^ ") },
  bullet: { label: "• List", title: "Bullet list", run: (t, s, e) => prefixLines(t, s, e, "- ") },
  table: { label: "Table", title: "Table", run: (t, s, e) => insertBlock(t, s, e, "|! Heading | Heading |\n| Cell | Cell |") },
  page: { label: "New page", title: "New page", run: (t, s, e) => insertBlock(t, s, e, "---page---") },
  blank: { label: "[ ] Blank", title: "Blank filled in when sending", run: (t, s, e) => wrap(t, s, e, "[", "]", "Blank name") },
  address: { label: "Address block", title: "Address block (contact person, company, address)", run: (t, s, e) => insertBlock(t, s, e, "[Their Contact Person?]\n[Company Name]\n[Address?]") },
  greeting: { label: "Dear name", title: "Greeting name (e.g. Ms. Jessie)", run: (t, s, e) => { const out = t.slice(0, s) + "[Salutation]" + t.slice(e); return { text: out, start: s, end: s + 12 }; } },
  signature: { label: "Signature", title: "Where the signature goes (switch it on under step 5)", run: (t, s, e) => insertBlock(t, s, e, "{signature}") },
  link: { label: "Link", title: "Link", run: (t, s, e) => { const r = wrap(t, s, e, "[", "](https://)", "Link text"); return { ...r, start: r.end + 2, end: r.end + 10 }; } },
};

export function applyFormat(key, text, start, end) {
  const f = FORMATS[key];
  return f ? f.run(String(text || ""), start, end) : { text, start, end };
}
