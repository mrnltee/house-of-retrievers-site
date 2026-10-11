import { NextResponse } from "next/server";
import { loadPublicSupporters } from "../../lib/publicSupporters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The home page's "Our partners & sponsors" section reads this. Only public
 * records (confirmed, switched on, with a logo and a blurb); never contact
 * details. Cached at the edge for five minutes.
 */
export async function GET() {
  const supporters = await loadPublicSupporters();
  return NextResponse.json(
    { supporters },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
