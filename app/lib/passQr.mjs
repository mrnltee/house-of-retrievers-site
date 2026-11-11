import { cleanCompType, compLabel } from "./compTickets.mjs";

/**
 * Check-in QR colours (owner, 2026-11-12): near-black for everyone, HOR's dark
 * gold for complimentary guests (Guest, VIP, Organizer) so the door can spot
 * them. The gold stays dark on white (about 6:1) so phones and the door scanner
 * read it as easily as black. The colour is a courtesy, not proof: the door's
 * welcome card shows the complimentary label from the database.
 */
export const QR_INK = "#0d0d0d";
export const COMP_QR_INK = "#7a5a12";

export const passQrInk = (comp) => (cleanCompType(comp) ? COMP_QR_INK : QR_INK);

/** QRCode options for a pass, in the right colour. */
export const passQrColor = (comp) => ({ dark: passQrInk(comp), light: "#ffffff" });

/** "VIP · Complimentary" under a complimentary guest's QR, else "". */
export const compPassLine = (comp) => (cleanCompType(comp) ? `${compLabel(comp)} · Complimentary` : "");

/** Contrast of an ink on white (WCAG formula), for the test. */
export function contrastOnWhite(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (l + 0.05);
}
