import { LAUNCH_AT } from "../../lib/countdownHost.mjs";

/**
 * The society's registered name and SEC number, released only from launch.
 * Kept out of the page code until then so they can't be read in the source
 * before the unveiling.
 *
 * Preview deployments (staging and branch previews) and local dev release
 * them straight away so the full footer can be reviewed before launch.
 * Production (VERCEL_ENV=production) still waits for LAUNCH_AT.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
  const released = env !== "production" || Date.now() >= LAUNCH_AT;
  const body = released
    ? { org: "The House of Retrievers Society Inc.", sec: "2026090268846-06" }
    : { releaseAt: LAUNCH_AT };
  return Response.json(body, { headers: { "Cache-Control": released ? "public, max-age=300, s-maxage=3600" : "no-store" } });
}
