/**
 * The email editor's WYSIWYG box (admin Email templates and the reminder
 * composer) writes the same plain markup the emails already use, so nothing
 * stored or rendered changes: a blank line is a paragraph, a single line break
 * stays a line break, **text** is bold, [text](https://…) is a link, and a line
 * starting with "• " is a bullet.
 *
 * markupToHtml fills the editor; htmlToMarkup turns what the browser's
 * contenteditable produced back into markup. Pure strings, so both are tested.
 */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BULLET = /^•\s?/;

function inline(line) {
  return esc(line)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]\n]{1,120})\]\((https:\/\/[^\s()<>"]+)\)/g, '<a href="$2">$1</a>');
}

/** Markup → the editor's HTML (paragraphs, line breaks, bold, links, bullet lists). */
export function markupToHtml(markup) {
  const paragraphs = String(markup || "").replace(/\r\n?/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const para of paragraphs) {
    let lines = [];
    let items = [];
    const flushLines = () => { if (lines.length) out.push(`<p>${lines.join("<br>")}</p>`); lines = []; };
    const flushItems = () => { if (items.length) out.push(`<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`); items = []; };
    for (const line of para.split("\n")) {
      if (BULLET.test(line)) { flushLines(); items.push(inline(line.replace(BULLET, ""))); }
      else { flushItems(); lines.push(inline(line)); }
    }
    flushLines();
    flushItems();
  }
  return out.join("");
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") {
    const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  }
  return ENTITIES[e.toLowerCase()] ?? m;
});

/** The editor's HTML → markup. Unknown tags keep their text; only bold, links, breaks, paragraphs and lists survive. */
export function htmlToMarkup(html) {
  let out = "";
  const para = () => { if (out) out = out.replace(/\n*$/, "") + "\n\n"; };
  const hrefs = [];
  const re = /<(\/?)([a-z][a-z0-9]*)\b([^>]*)>|([^<]+)/gi;
  let m;
  while ((m = re.exec(String(html || "")))) {
    if (m[4] !== undefined) { out += decode(m[4]).replace(/[\r\n]+/g, " "); continue; }
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (tag === "b" || tag === "strong") out += "**";
    else if (tag === "br") out += "\n";
    else if (tag === "a") {
      if (closing) {
        const href = hrefs.pop();
        out += href ? `](${href})` : "";
      } else {
        const found = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[3]);
        const href = found ? decode(found[1] ?? found[2]) : "";
        const ok = /^https:\/\/[^\s()<>"]+$/.test(href);
        hrefs.push(ok ? href : "");
        if (ok) out += "[";
      }
    } else if (tag === "p" || tag === "div" || tag === "ul" || tag === "ol") {
      if (tag === "ul" || tag === "ol") { if (!closing && out && !out.endsWith("\n")) out += "\n"; }
      else if (!closing) para();
    } else if (tag === "li") {
      if (closing) out += "\n";
      else { if (out && !out.endsWith("\n")) out += "\n"; out += "• "; }
    }
  }
  return out
    .replace(/\*\*(\s*)\*\*/g, "$1")
    // bold markers hug their words: "** hi **" would not render as bold
    .replace(/\*\*([^*\n]+?)\*\*/g, (_, t) => { const lead = t.match(/^\s*/)[0]; const tail = t.match(/\s*$/)[0]; const core = t.trim(); return core ? `${lead}**${core}**${tail}` : t; })
    .replace(/\[([^\]]*)\]\(/g, (_, t) => `[${t.replace(/[\[\]]/g, "")}](`)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
