import { LAUNCH_AT } from "../../lib/countdownHost.mjs";

/**
 * The society's registered name and SEC number, released only from launch.
 * Kept out of the page code until then so they can't be read in the source
 * before the unveiling.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const released = Date.now() >= LAUNCH_AT;
  const body = released
    ? { org: "The House of Retrievers Society Inc.", sec: "2026090268846-06" }
    : { releaseAt: LAUNCH_AT };
  return Response.json(body, { headers: { "Cache-Control": released ? "public, max-age=300, s-maxage=3600" : "no-store" } });
}
