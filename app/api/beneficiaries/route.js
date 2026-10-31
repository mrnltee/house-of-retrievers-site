import { NextResponse } from "next/server";
import { loadPublicBeneficiaries } from "../../lib/publicBeneficiaries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The home page's beneficiaries section reads this. Only the ones an admin
 * switched on (Partnered or Ended, with a short line); never contact details,
 * address or notes. Cached at the edge for five minutes.
 */
export async function GET() {
  const beneficiaries = await loadPublicBeneficiaries();
  return NextResponse.json(
    { beneficiaries },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
