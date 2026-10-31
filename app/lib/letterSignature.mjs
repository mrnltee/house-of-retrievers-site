/**
 * Letter signatures (owner, 2026-10-31): a signature image laid over the PDF
 * where the letter has a {signature} line (usually just above the signatory's
 * name). It takes no room: text stays where it is and the image sits on top.
 * Position: x = share of the text width from the left (0..1), dy = points
 * up (-) or down (+) from the marker, width in points. Pure functions.
 */
export const SIGNATURE_MARK = "{signature}";
/** The text width of an A4 letter page, in points (595 - 2 × 60 margins). */
export const TEXT_WIDTH_PT = 475;
export const SIGNATURE_LIMITS = { x: [0, 0.85], dy: [-80, 60], width: [60, 260] };
export const SIGNATURE_DEFAULT = { on: false, image: "", x: 0, dy: -28, width: 140 };

const clamp = (value, [lo, hi], fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const OWN_IMAGE = /^\/api\/event-image\/[0-9a-f-]{36}$/;

/** Any stored or posted settings → clean settings. */
export function cleanSignature(input) {
  const s = input && typeof input === "object" ? input : {};
  return {
    on: s.on === true || s.on === "on" || s.on === "true" || s.on === "1",
    image: OWN_IMAGE.test(String(s.image || "")) ? s.image : "",
    x: Math.round(clamp(s.x, SIGNATURE_LIMITS.x, SIGNATURE_DEFAULT.x) * 1000) / 1000,
    dy: Math.round(clamp(s.dy, SIGNATURE_LIMITS.dy, SIGNATURE_DEFAULT.dy)),
    width: Math.round(clamp(s.width, SIGNATURE_LIMITS.width, SIGNATURE_DEFAULT.width)),
  };
}

/** Does this letter text have a place for the signature? */
export const hasSignatureMark = (text) => String(text || "").split(/\n{2,}/).some((b) => b.trim() === SIGNATURE_MARK);
