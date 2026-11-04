/**
 * Email designs (owner, 2026-11-04): block-built emails for brand outreach with a
 * header, body and footer. This module is shared by the editor (preview) and the
 * server (save, send): document checks, colour parsing, HTML cleaning, fill-ins and
 * rendering to email-safe HTML (tables, inline styles). No outside packages.
 */

import { HOME_URL } from "./siteSeo.mjs";
import { LEGAL } from "./legal.mjs";

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
/** A link that is a fill-in, e.g. [Event Link]: allowed in a design, checked again once filled in. */
const fillInHref = (href) => (/^\[[^\]\n]{1,80}\]$/.test(String(href || "").trim()) ? String(href).trim() : "");

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
    const href = safeHref(b.href) || fillInHref(b.href);
    if (b.href && !href) return { error: `${where}: the picture's link must start with https:// or mailto:, or be a fill-in like [Event Link].` };
    if (href) block.href = href;
  } else if (type === "button") {
    const href = safeHref(b.href) || fillInHref(b.href);
    if (!href) return { error: `${where}: the button's link must start with https:// or mailto:, or be a fill-in like [Event Link].` };
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

// ---------- Rendering (email-safe HTML: tables and inline styles) ----------

const FONT = "Helvetica,Arial,sans-serif";
const INK = "#2b2a27";
const LINK = "#7a5c1f";
const px = (v) => (v || [0, 0, 0, 0]).map((n) => `${n}px`).join(" ");
const abs = (src) => (String(src).startsWith("/") ? `${HOME_URL}${src}` : String(src));
const T = (inner, attrs = "") => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${attrs}>${inner}</table>`;

/** A block or zone box: margin as padding on an outer cell (email apps ignore margin), then background, padding and alignment. */
function wrap(style = {}, inner) {
  const align = style.align || "left";
  const innerCell = `<td align="${align}" style="${style.background ? `background:${style.background};` : ""}padding:${px(style.padding)};text-align:${align}">${inner}</td>`;
  const boxed = T(`<tr>${innerCell}</tr>`);
  return style.margin && style.margin.some(Boolean) ? T(`<tr><td style="padding:${px(style.margin)}">${boxed}</td></tr>`) : boxed;
}

const styleText = (html) => html
  .replace(/<p>/g, '<p style="margin:0 0 12px">')
  .replace(/<a href=/g, `<a style="color:${LINK};text-decoration:underline" href=`)
  .replace(/<(ul|ol)>/g, '<$1 style="margin:0 0 12px;padding-left:22px">');

function blockHtml(b) {
  let inner = "";
  if (b.type === "text") {
    inner = `<div style="font:${b.size || 16}px/1.6 ${FONT};color:${b.color || INK}">${styleText(b.html || "")}</div>`;
  } else if (b.type === "image") {
    const img = `<img src="${escHtml(abs(b.src))}" alt="${escHtml(b.alt || "")}" width="${Math.round(560 * (b.width || 100) / 100)}" style="display:inline-block;width:${b.width || 100}%;max-width:100%;height:auto;border:0">`;
    const href = safeHref(b.href);
    inner = href ? `<a href="${escHtml(href)}" target="_blank">${img}</a>` : img;
  } else if (b.type === "button") {
    const href = safeHref(b.href);
    if (!href) return "";
    const align = b.style?.align || "left";
    inner = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}" style="${align === "center" ? "margin:0 auto" : ""}"><tr><td style="border-radius:999px;background:${b.color}"><a href="${escHtml(href)}" target="_blank" style="display:inline-block;padding:13px 24px;font:700 15px ${FONT};color:${b.textColor};text-decoration:none;border-radius:999px">${escHtml(b.label)}</a></td></tr></table>`;
  } else if (b.type === "divider") {
    inner = `<div style="border-top:${b.thickness}px solid ${b.color};line-height:0;font-size:0">&nbsp;</div>`;
  } else if (b.type === "space") {
    inner = `<div style="height:${b.height}px;line-height:${b.height}px;font-size:0">&nbsp;</div>`;
  } else if (b.type === "columns") {
    const width = Math.floor(100 / b.count);
    inner = T(`<tr>${b.cols.map((c) => `<td class="ed-col" width="${width}%" valign="top" style="width:${width}%;padding:0 6px;vertical-align:top">${c.blocks.map(blockHtml).join("")}</td>`).join("")}</tr>`);
  }
  return wrap(b.style, inner);
}

const textOf = (html) => decode(String(html || "").replace(/<br>/g, "\n").replace(/<\/(p|li)>/g, "\n").replace(/<li>/g, "• ").replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, "$2 ($1)").replace(/<[^>]+>/g, "")).replace(/\n{3,}/g, "\n\n").trim();

function blockText(b) {
  if (b.type === "text") return textOf(b.html);
  if (b.type === "image") return b.alt ? `[${b.alt}]` : "";
  if (b.type === "button") return safeHref(b.href) ? `${b.label}: ${b.href}` : "";
  if (b.type === "columns") return b.cols.map((c) => c.blocks.map(blockText).filter(Boolean).join("\n")).filter(Boolean).join("\n\n");
  return "";
}

/** HOR's shared header and footer until an admin saves their own (Email designs → HOR header & footer). */
export const HOUSE_DEFAULT = {
  header: { style: { background: "#0d0d0d", padding: [0, 0, 0, 0] }, blocks: [{ type: "image", src: `${HOME_URL}/email/header-center.png`, width: 100, alt: LEGAL.org, style: { align: "center" } }] },
  footer: {
    style: { padding: [20, 28, 26, 28], align: "center" },
    blocks: [
      { type: "divider", color: "#ede7d8", thickness: 1, style: { margin: [0, 0, 14, 0] } },
      { type: "text", size: 13, color: "#6b6960", style: { align: "center" }, html: `<p><strong>${escHtml(LEGAL.org.toUpperCase().replace(" INC.", ", INC."))}</strong><br>SEC Registration: ${escHtml(LEGAL.sec)}<br><a href="https://${LEGAL.website}/" target="_blank">${escHtml(LEGAL.website)}</a></p><p>Reply to this email to reach the team.</p>` },
    ],
  },
};

const zoneHtml = (zone) => (zone && zone.blocks?.length ? `<tr><td style="padding:0">${wrap(zone.style, zone.blocks.map(blockHtml).join(""))}</td></tr>` : "");

/**
 * A design → { subject, html, text }. The shared HOR header/footer (`house`, or the
 * default when none is saved) are used unless the design has its own.
 */
export function renderDesign(doc, { house = HOUSE_DEFAULT, subject = "", preheader = "" } = {}) {
  const shared = house || HOUSE_DEFAULT;
  const header = doc.ownHeader ? doc.header : shared.header;
  const footer = doc.ownFooter ? doc.footer : shared.footer;
  const zones = [header, doc.body, footer];
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escHtml(subject)}</title>
<style>@media (max-width:600px){.ed-col{display:block!important;width:100%!important;padding:0 0 12px!important}}</style></head>
<body style="margin:0;padding:0;background:#f5f1e6">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escHtml(preheader || subject)}</span>
${T(`<tr><td align="center" style="padding:24px 12px">${T(zones.map(zoneHtml).join(""), ' style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden"')}</td></tr>`, ' style="background:#f5f1e6"')}
</body></html>`;
  const text = zones.map((z) => (z?.blocks || []).map(blockText).filter(Boolean).join("\n\n")).filter(Boolean).join("\n\n");
  return { subject, html, text };
}

/** Every piece of text in a design (and its subject), for finding the [fill-ins] a send needs. */
export function designTexts(doc, subject = "") {
  const out = [subject];
  const walk = (b) => {
    if (b.type === "text") out.push(textOf(b.html));
    if (b.type === "image") out.push(b.alt || "", b.href || "");
    if (b.type === "button") out.push(b.label || "", b.href || "");
    if (b.type === "columns") b.cols.forEach((c) => c.blocks.forEach(walk));
  };
  for (const zone of ZONES) (doc[zone]?.blocks || []).forEach(walk);
  return out;
}

/**
 * Fills a design's [fill-ins]. `fill(text, { html })` returns the text filled in; with
 * html true the values must come back escaped (they go into email HTML).
 */
export function fillDesign(doc, subject, fill) {
  const walk = (b) => {
    const c = { ...b };
    if (c.type === "text") c.html = fill(c.html || "", { html: true });
    if (c.type === "image") { c.alt = fill(c.alt || "", { html: false }); if (c.href) c.href = fill(c.href, { html: false }); }
    if (c.type === "button") { c.label = fill(c.label || "", { html: false }); c.href = fill(c.href || "", { html: false }); }
    if (c.type === "columns") c.cols = c.cols.map((col) => ({ blocks: col.blocks.map(walk) }));
    return c;
  };
  const next = { ...doc };
  for (const zone of ZONES) if (doc[zone]) next[zone] = { ...doc[zone], blocks: (doc[zone].blocks || []).map(walk) };
  return { doc: next, subject: fill(subject || "", { html: false }) };
}

// ---------- Starters for the five kinds (HOR can reword them after) ----------

const t = (html, extra = {}) => ({ type: "text", html, ...extra });
const PORTFOLIO = { type: "button", label: "View our Partnership Portfolio", href: "https://canva.link/hor", style: { align: "center", margin: [4, 0, 16, 0] } };
const SIGN = t("<p>With gratitude,<br><strong>[Signatory Name]</strong><br>[Signatory Position]<br>The House of Retrievers’ Society, Inc.</p>");
const body = (blocks) => ({ style: { padding: [28, 28, 12, 28] }, blocks });
const empty = { style: {}, blocks: [] };
const starter = (name, subject, blocks) => ({ name, subject, doc: { ownHeader: false, ownFooter: false, header: empty, footer: empty, body: body(blocks) } });

export const STARTERS = {
  "invite-cover": starter("Invite: cover email", "Invitation to partner with us: [Event Name]", [
    t("<p>Dear [Salutation],</p><p>Warm greetings from The House of Retrievers’ Society, Inc.</p><p>We would love to invite [Company Name] to be part of <strong>[Event Name]</strong> on [Event Date]. Our letter, with the details and ways to take part, is attached as a PDF.</p>"),
    PORTFOLIO,
    t("<p>Simply reply to this email if you have questions or would like to talk.</p>"),
    SIGN,
  ]),
  "invite-full": starter("Invite: full email", "Partner with us for [Event Name]", [
    t("<p>Dear [Salutation],</p><p>Warm greetings from The House of Retrievers’ Society, Inc.! We are reaching out to invite [Company Name] to join us as a sponsor or partner for our upcoming event, <strong>[Event Name]</strong>.</p>"),
    { type: "columns", count: 2, style: { background: "#f5f1e6", padding: [16, 12, 16, 12], margin: [4, 0, 16, 0], align: "center" }, cols: [
      { blocks: [t("<p><strong>When</strong><br>[Event Date]<br>[Event Time]</p>", { size: 15, style: { align: "center" } })] },
      { blocks: [t("<p><strong>Where</strong><br>[Event Location]</p>", { size: 15, style: { align: "center" } })] },
    ] },
    t("<p>Proceeds support our beneficiaries: [Event Beneficiaries].</p><p>Your brand can take part through product sponsorship, samples, giveaways or other support. In return, we will feature your brand in our event social media, brand mentions and post-event appreciation posts.</p>"),
    PORTFOLIO,
    t("<p>Just reply to this email to let us know, or to ask anything. We hope you can join us!</p>"),
    SIGN,
  ]),
  "follow-up": starter("Follow-up", "Following up: [Event Name] on [Event Date]", [
    t("<p>Dear [Salutation],</p><p>We hope you are well! We are following up on our invitation for [Company Name] to be part of <strong>[Event Name]</strong> on [Event Date].</p><p>We would be glad to answer any questions or adjust the partnership to what works best for your brand. A quick reply is all we need.</p>"),
    PORTFOLIO,
    SIGN,
  ]),
  "thanks-yes": starter("Thank you for saying yes", "Thank you for joining [Event Name]!", [
    t("<p>Dear [Salutation],</p><p>Thank you for saying yes to <strong>[Event Name]</strong>! We are so happy to have [Company Name] with us.</p><p><strong>Next steps</strong></p><ul><li>Send us your logo (PNG with a transparent background) for our posts and materials.</li><li>Tell us your booth or display needs, and who will be coming.</li><li>Let us know your contact person for the day.</li></ul><p>Just reply to this email with these details.</p>"),
    { type: "columns", count: 2, style: { background: "#f5f1e6", padding: [16, 12, 16, 12], margin: [4, 0, 16, 0], align: "center" }, cols: [
      { blocks: [t("<p><strong>When</strong><br>[Event Date]<br>[Event Time]</p>", { size: 15, style: { align: "center" } })] },
      { blocks: [t("<p><strong>Where</strong><br>[Event Location]</p>", { size: 15, style: { align: "center" } })] },
    ] },
    SIGN,
  ]),
  "thanks-no": starter("Thank you anyway", "Thank you, [Company Name]", [
    t("<p>Dear [Salutation],</p><p>Thank you for taking the time to consider <strong>[Event Name]</strong>. We completely understand, and we truly appreciate your reply.</p><p>We would love to keep in touch for future events and causes. Our door is always open.</p>"),
    SIGN,
  ]),
};
