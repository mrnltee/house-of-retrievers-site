/**
 * The small rich text the Media hub allows: <strong>, <em>, <br> and links.
 *
 * It rebuilds the markup rather than trying to strip bad parts out: every tag
 * is read, and only these four come back, written fresh with no attributes
 * except a link's href, which must be https:, http:, mailto: or a path on this
 * site. Everything else is dropped (tags) or escaped (stray < and >), so tricks
 * like `<a/onclick=…>`, `<img src=x onerror=…>` or `javajavascript:script:`
 * have nothing to survive in. Used when saving and again when showing the page.
 */

const DROP_BLOCKS = /<(script|style|iframe|object|embed|template|noscript|textarea|title|xmp)\b[\s\S]*?<\/\1\s*>/gi;
const COMMENTS = /<!--[\s\S]*?(?:-->|$)/g;
const TAG = /<\/?[a-zA-Z!?][^<>]*>/g;
const ENTITY = /^&(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#[0-9]{1,7}|#x[0-9a-fA-F]{1,6});/;

function escapeText(text) {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (ch === "&") out += ENTITY.test(text.slice(i)) ? "&" : "&amp;";
    else out += ch;
  }
  return out;
}

const escapeAttr = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const NAMED = { amp: "&", colon: ":", tab: "\t", newline: "\n", sol: "/", quot: '"', apos: "'", lt: "<", gt: ">", period: ".", lpar: "(", rpar: ")" };

/** Decodes entities the way a browser would before it reads the URL scheme. */
function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);?/gi, (whole, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    const named = NAMED[body.toLowerCase()];
    return named === undefined ? whole : named;
  });
}

/** The link if it's safe to keep, else null. */
export function safeHref(raw) {
  // Browsers ignore control characters and whitespace inside a scheme ("java\tscript:").
  const href = decodeEntities(String(raw || "")).replace(/[\u0000- \u007f-\u009f]/g, "");
  if (!href) return null;
  if (/^(?:https?:\/\/|mailto:)/i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")) return href;
  if (href.startsWith("#")) return href;
  return null;
}

function hrefOf(attributes) {
  const match = attributes.match(/(?:^|[\s/])href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : "";
}

function rebuildTag(tag) {
  const match = tag.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^]*?)\/?>$/);
  if (!match) return "";
  const closing = match[1] === "/";
  const name = match[2].toLowerCase();
  if (name === "br") return "<br>";
  if (name === "strong" || name === "em") return closing ? `</${name}>` : `<${name}>`;
  if (name === "b") return closing ? "</strong>" : "<strong>";
  if (name === "i") return closing ? "</em>" : "<em>";
  if (name === "a") {
    if (closing) return "</a>";
    const href = safeHref(hrefOf(match[3]));
    const external = href && /^https?:/i.test(href);
    return href ? `<a href="${escapeAttr(href)}"${external ? ' rel="noopener noreferrer"' : ""}>` : "<a>";
  }
  return "";
}

/** Keeps only strong, em, br and safe links; escapes or drops everything else. */
export function safeRichHtml(value) {
  const source = String(value ?? "").replace(DROP_BLOCKS, "").replace(COMMENTS, "");
  let out = "";
  let last = 0;
  for (const match of source.matchAll(TAG)) {
    out += escapeText(source.slice(last, match.index));
    out += rebuildTag(match[0]);
    last = match.index + match[0].length;
  }
  return out + escapeText(source.slice(last));
}
