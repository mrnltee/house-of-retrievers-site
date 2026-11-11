import { COMP_QR_INK, QR_INK } from "../../../lib/passQr.mjs";
import QRCode from "qrcode";
import { normalizeCode } from "../../../lib/admin/registrations.mjs";
import { EVENTS_URL } from "../../../lib/eventsHost.mjs";

export const runtime = "nodejs";

/**
 * The check-in QR as a PNG, for the pass email (email apps don't run the
 * pass page's inline SVG). It encodes the pass link for a well-formed code
 * and looks nothing up: whoever has the code already has the pass link.
 */
export async function GET(request, { params }) {
  const { code: raw } = await params;
  const code = normalizeCode(raw);
  if (!code) return new Response("Not found", { status: 404 });
  // ?tone=comp: a complimentary guest's gold QR (a colour only; the door checks the registration).
  const comp = new URL(request.url).searchParams.get("tone") === "comp";
  const png = await QRCode.toBuffer(`${EVENTS_URL}/r/${code}`, { type: "png", width: 400, margin: 1, errorCorrectionLevel: "M", color: { dark: comp ? COMP_QR_INK : QR_INK, light: "#ffffff" } });
  return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
