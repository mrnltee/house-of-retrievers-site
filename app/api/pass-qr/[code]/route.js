import QRCode from "qrcode";
import { normalizeCode } from "../../../lib/admin/registrations.mjs";
import { EVENTS_URL } from "../../../lib/eventsHost.mjs";

export const runtime = "nodejs";

/**
 * The check-in QR as a PNG, for the pass email (email apps don't run the
 * pass page's inline SVG). It encodes the pass link for a well-formed code
 * and looks nothing up: whoever has the code already has the pass link.
 */
export async function GET(_request, { params }) {
  const { code: raw } = await params;
  const code = normalizeCode(raw);
  if (!code) return new Response("Not found", { status: 404 });
  const png = await QRCode.toBuffer(`${EVENTS_URL}/r/${code}`, { type: "png", width: 400, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0d0d0d", light: "#ffffff" } });
  return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
