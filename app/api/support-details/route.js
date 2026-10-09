import { NextResponse } from "next/server";
import { hasDatabase, sql } from "../../lib/db";
import { publicMethods } from "../../lib/admin/payments.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Donation details for the Support the pack panel: only methods an Owner
 * approved and switched on. `configured: false` means the admin isn't live
 * yet, and the panel keeps its built-in preview.
 */
export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ configured: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    const rows = await sql("SELECT key, enabled, details, qr_image, updated_at FROM payment_methods");
    return NextResponse.json({ configured: true, methods: publicMethods(rows) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ configured: true, methods: [], unavailable: true }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
