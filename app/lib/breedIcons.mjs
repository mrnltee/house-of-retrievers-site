/**
 * HOR's own breed icons, uploaded in the admin to replace the built-in ones.
 * Specs: square, transparent, head only; SVG (any square viewBox) or a
 * 256 x 256 PNG/WebP; up to 100 KB. SVGs are checked strictly because a
 * malicious SVG can carry script.
 */

export const BREED_ICON_MAX_BYTES = 100 * 1024;
export const BREED_ICON_RASTER_SIZE = 256;

const UNSAFE = [/<script/i, /\son[a-z]+\s*=/i, /javascript:/i, /<foreignObject/i, /<iframe/i, /<embed/i, /<object/i, /(?:xlink:)?href\s*=\s*["']\s*(?!#)/i, /url\(\s*["']?\s*(?!#)/i, /<!ENTITY/i];

/** An uploaded SVG's text → {} when it's a safe square icon, else { error }. */
export function checkBreedIconSvg(text) {
  const source = String(text || "");
  if (!/<svg[\s>]/i.test(source)) return { error: "That file isn't an SVG." };
  if (UNSAFE.some((pattern) => pattern.test(source))) return { error: "That SVG can't be used: it contains scripts, links or embedded files. Export it again as a plain drawing." };
  const box = source.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i);
  if (!box || Number(box[1]) <= 0 || Math.abs(Number(box[1]) - Number(box[2])) > 0.01) return { error: "The icon must be square, with a square viewBox like 0 0 64 64." };
  return {};
}

/** A data URL from the browser → { value: { mime, bytes } } or { error }. Raster dimensions are checked on the server with sharp. */
export function readBreedIconUpload(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return { error: "Pick an icon file first." };
  const mime = match[1];
  if (!["image/svg+xml", "image/png", "image/webp"].includes(mime)) return { error: "Use an SVG, PNG or WebP file." };
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > BREED_ICON_MAX_BYTES) return { error: "That icon is larger than 100 KB. Simplify it or export it smaller." };
  if (mime === "image/svg+xml") {
    const check = checkBreedIconSvg(bytes.toString("utf8"));
    if (check.error) return check;
  }
  return { value: { mime, bytes } };
}
