import { NextResponse } from "next/server";
import { daysSinceRefresh, refreshAccessToken, REFRESH_AFTER_DAYS } from "../../../lib/instagramToken";
import { isCronAuthorized } from "../../../lib/cronAuth.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/**
 * Monthly token rotation, scheduled in vercel.json.
 *
 * Vercel signs its own cron calls with CRON_SECRET; anything else is refused
 * (and everything is, when CRON_SECRET is missing),
 * so this cannot be triggered by a stranger who guesses the path. Pass
 * ?force=1 as an authorised caller to rotate ahead of schedule.
 */
export async function GET(request) {
  if (!isCronAuthorized(request.headers)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401, headers: noStore });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const age = await daysSinceRefresh();

  if (!force && age !== null && age < REFRESH_AFTER_DAYS) {
    return NextResponse.json(
      { ok: true, skipped: true, daysSinceRefresh: Math.round(age), refreshAfterDays: REFRESH_AFTER_DAYS },
      { headers: noStore },
    );
  }

  try {
    const record = await refreshAccessToken();
    return NextResponse.json(
      { ok: true, refreshedAt: record.refreshedAt, expiresInDays: Math.round(record.expiresIn / 86_400) },
      { headers: noStore },
    );
  } catch (error) {
    // Surface the reason: a failed rotation is the one thing worth alerting on.
    return NextResponse.json(
      { ok: false, error: String(error.message || error) },
      { status: 502, headers: noStore },
    );
  }
}
