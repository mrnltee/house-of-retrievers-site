/**
 * Email designs (owner, 2026-11-04): block-built emails for brand outreach with a
 * header, body and footer. This module is shared by the editor (preview) and the
 * server (save, send): document checks, colour parsing, HTML cleaning, fill-ins and
 * rendering to email-safe HTML (tables, inline styles). No outside packages.
 */

/** The kinds of design (spec: five types for brand outreach under an event). */
export const KINDS = [
  ["invite-cover", "Invite: cover email", "A short note; the letter goes as a PDF attachment.", true],
  ["invite-full", "Invite: full email", "The whole invitation in the email, no attachment.", false],
  ["follow-up", "Follow-up", "A gentle reminder for brands with no reply yet.", false],
  ["thanks-yes", "Thank you for saying yes", "Next steps after a brand says yes.", false],
  ["thanks-no", "Thank you anyway", "For a brand that said no this time.", false],
];
export const kindLabel = (key) => (key === "house" ? "HOR header & footer" : KINDS.find(([k]) => k === key)?.[1] || key);

export const ZONES = ["header", "body", "footer"];
export const BLOCK_TYPES = ["text", "image", "columns", "button", "divider", "space"];
export const DESIGN_LIMITS = { name: 80, subject: 150, blocks: 40, html: 8000, label: 60, alt: 200 };

const clamp = (n, lo, hi, fallback = lo) => (Number.isFinite(Number(n)) ? Math.min(hi, Math.max(lo, Math.round(Number(n)))) : fallback);
const hex2 = (n) => clamp(n, 0, 255).toString(16).padStart(2, "0");

/** "#abc", "#aabbcc", "rgb(…)" or "hsl(…)" → "#rrggbb"; anything else → "". */
export function toHex(value) {
  const v = String(value || "").trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return `#${[...m[1]].map((c) => c + c).join("")}`;
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  const nums = (s) => s.split(/[\s,/]+/).filter(Boolean).map((x) => parseFloat(x));
  m = v.match(/^rgba?\(([^)]*)\)$/);
  if (m) {
    const [r, g, b] = nums(m[1]);
    return [r, g, b].every(Number.isFinite) ? `#${hex2(r)}${hex2(g)}${hex2(b)}` : "";
  }
  m = v.match(/^hsla?\(([^)]*)\)$/);
  if (m) {
    let [h, s, l] = nums(m[1].replace(/deg|%/g, ""));
    if (![h, s, l].every(Number.isFinite)) return "";
    h = ((h % 360) + 360) % 360;
    s = Math.min(100, Math.max(0, s)) / 100;
    l = Math.min(100, Math.max(0, l)) / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return `#${hex2(f(0) * 255)}${hex2(f(8) * 255)}${hex2(f(4) * 255)}`;
  }
  return "";
}

/** "#a78440" → "rgb(167, 132, 64)" and "hsl(40, 45%, 45%)", for showing a colour in the format picked. */
export function fromHex(hex, format = "hex") {
  const h = toHex(hex);
  if (!h || format === "hex") return h;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (format === "rgb") return `rgb(${r}, ${g}, ${b})`;
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d) hue = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return `hsl(${Math.round(((hue * 60) + 360) % 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

export const escHtml = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const decode = (text) => String(text).replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");
export const safeHref = (href) => (/^(https?:\/\/|mailto:)/i.test(String(href || "").trim()) ? String(href).trim() : "");

const KEEP = { strong: "strong", b: "strong", em: "em", i: "em", u: "u", p: "p", div: "p", br: "br", a: "a", ul: "ul", ol: "ol", li: "li", span: "span", font: "span" };
const DROP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "head", "title", "template", "svg", "math", "noscript", "textarea", "select"]);
const SIZE_WORDS = { "xx-small": 12, "x-small": 12, small: 13, medium: 16, large: 18, "x-large": 24, "xx-large": 32, "xxx-large": 40 };

function attrs(text) {
  const out = {};
  for (const m of String(text).matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}

function spanStyle(a, tag) {
  const parts = [];
  const rules = Object.fromEntries(String(a.style || "").split(";").map((r) => r.split(":")).filter((r) => r.length >= 2).map(([k, ...v]) => [k.trim().toLowerCase(), v.join(":").trim().toLowerCase()]));
  const color = toHex(rules.color || (tag === "font" ? a.color : ""));
  if (color) parts.push(`color:${color}`);
  const size = rules["font-size"];
  if (size) {
    const px = SIZE_WORDS[size] ?? (/^\d+(\.\d+)?px$/.test(size) ? parseFloat(size) : NaN);
    if (px >= 12 && px <= 40) parts.push(`font-size:${Math.round(px)}px`);
  }
  return parts.join(";");
}

/**
 * Rich text from the editor (or pasted from Word / Google Docs) → only the allowed
 * formatting: paragraphs, line breaks, bold, italic, underline, links (http, https,
 * mailto), lists, and spans with a colour or a size. Everything else is unwrapped or,
 * for scripts and the like, dropped with its content.
 */
export function cleanHtml(html) {
  const out = [];
  const open = [];
  let skip = 0;
  for (const m of String(html || "").matchAll(/<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|[^<]+|</g)) {
    const [token, rawTag, rest = ""] = m;
    if (token.startsWith("<!--")) continue;
    if (!rawTag) { if (!skip) out.push(escHtml(decode(token))); continue; }
    const tag = rawTag.toLowerCase();
    const closing = token.startsWith("</");
    if (DROP_WITH_CONTENT.has(tag)) { if (!/\/>$/.test(token)) skip += closing ? -1 : 1; skip = Math.max(0, skip); continue; }
    if (skip) continue;
    const name = KEEP[tag];
    if (!name) continue;
    if (closing) {
      const at = open.map((t) => t.split("|")[0]).lastIndexOf(tag);
      if (at < 0) continue;
      while (open.length > at) { const t = open.pop(); const mapped = t.split("|")[1]; if (mapped) out.push(`</${mapped}>`); }
      continue;
    }
    if (name === "br") { out.push("<br>"); continue; }
    if (name === "a") {
      const href = safeHref(attrs(rest).href);
      open.push(`${tag}|${href ? "a" : ""}`);
      if (href) out.push(`<a href="${escHtml(href)}" target="_blank">`);
      continue;
    }
    if (name === "span") {
      const style = spanStyle(attrs(rest), tag);
      open.push(`${tag}|${style ? "span" : ""}`);
      if (style) out.push(`<span style="${style}">`);
      continue;
    }
    open.push(`${tag}|${name}`);
    out.push(`<${name}>`);
  }
  while (open.length) { const mapped = open.pop().split("|")[1]; if (mapped) out.push(`</${mapped}>`); }
  return out.join("").replace(/<(strong|em|u|span[^>]*|a[^>]*)><\/(strong|em|u|span|a)>/g, "").slice(0, DESIGN_LIMITS.html);
}

const box = (v) => (Array.isArray(v) ? [0, 1, 2, 3].map((i) => clamp(v[i], 0, 80, 0)) : undefined);

function cleanStyle(s = {}, where) {
  const style = {};
  if (s.background) {
    const bg = toHex(s.background);
    if (!bg) return { error: `${where}: “${String(s.background).slice(0, 30)}” isn't a colour. Use hex (#F5F1E6), rgb(…) or hsl(…).` };
    style.background = bg;
  }
  if (s.padding) style.padding = box(s.padding);
  if (s.margin) style.margin = box(s.margin);
  if (["left", "center", "right"].includes(s.align)) style.align = s.align;
  return { style };
}

function cleanBlock(b = {}, where, inColumn = false) {
  const type = String(b.type || "");
  if (!BLOCK_TYPES.includes(type) || (inColumn && type === "columns")) return { error: `${where}: “${type || "?"}” isn't a block that can go here.` };
  const st = cleanStyle(b.style, where);
  if (st.error) return st;
  const block = { type, style: st.style };
  if (type === "text") {
    block.html = cleanHtml(b.html);
    block.size = clamp(b.size, 12, 40, 16);
    const color = toHex(b.color);
    if (color) block.color = color;
  } else if (type === "image") {
    const src = String(b.src || "");
    if (!/^\/api\/event-image\/[0-9a-f-]{36}$/.test(src) && !/^https:\/\/[^\s"'<>]+$/.test(src)) return { error: `${where}: the picture needs to be uploaded here (or be an https address).` };
    block.src = src;
    block.width = clamp(b.width, 10, 100, 100);
    block.alt = String(b.alt || "").slice(0, DESIGN_LIMITS.alt);
    const href = safeHref(b.href);
    if (b.href && !href) return { error: `${where}: the picture's link must start with https:// or mailto:.` };
    if (href) block.href = href;
  } else if (type === "button") {
    const href = safeHref(b.href);
    if (!href) return { error: `${where}: the button's link must start with https:// or mailto:.` };
    block.label = String(b.label || "Open").slice(0, DESIGN_LIMITS.label);
    block.href = href;
    block.color = toHex(b.color) || "#a78440";
    block.textColor = toHex(b.textColor) || "#0d0d0d";
  } else if (type === "divider") {
    block.color = toHex(b.color) || "#ede7d8";
    block.thickness = clamp(b.thickness, 1, 6, 1);
  } else if (type === "space") {
    block.height = clamp(b.height, 4, 80, 16);
  } else if (type === "columns") {
    const count = Number(b.count) === 3 ? 3 : 2;
    block.count = count;
    block.cols = [];
    for (let i = 0; i < count; i++) {
      const blocks = [];
      for (const [j, inner] of (b.cols?.[i]?.blocks || []).slice(0, 10).entries()) {
        const c = cleanBlock(inner, `${where}, column ${i + 1} block ${j + 1}`, true);
        if (c.error) return c;
        blocks.push(c.block);
      }
      block.cols.push({ blocks });
    }
  }
  return { block };
}

/** Checks and tidies a design document; returns { doc } or { error } in plain words. */
export function cleanDoc(input = {}) {
  const doc = { ownHeader: Boolean(input.ownHeader), ownFooter: Boolean(input.ownFooter) };
  for (const zone of ZONES) {
    const z = input[zone] || {};
    const where = zone[0].toUpperCase() + zone.slice(1);
    const st = cleanStyle(z.style, where);
    if (st.error) return st;
    const blocks = [];
    const list = Array.isArray(z.blocks) ? z.blocks : [];
    if (list.length > DESIGN_LIMITS.blocks) return { error: `${where}: ${DESIGN_LIMITS.blocks} blocks at most.` };
    for (const [i, b] of list.entries()) {
      const c = cleanBlock(b, `${where} block ${i + 1}`);
      if (c.error) return c;
      blocks.push(c.block);
    }
    doc[zone] = { style: st.style, blocks };
  }
  return { doc };
}
