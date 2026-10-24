/** Whether the homepage "Our journey" timeline shows, and its layout — set in admin → Settings → Journey timeline. */
import { hasDatabase, sql } from "../../lib/db";
import { DEFAULT_JOURNEY_SETTINGS, cleanJourneyOrientation, cleanJourneyShow } from "../../lib/journeySettings.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabase()) return Response.json(DEFAULT_JOURNEY_SETTINGS, { headers: { "Cache-Control": "public, max-age=60" } });
  const [row] = await sql("SELECT show, orientation FROM journey_settings WHERE id=true");
  const settings = row
    ? { show: cleanJourneyShow(row.show), orientation: cleanJourneyOrientation(row.orientation) }
    : DEFAULT_JOURNEY_SETTINGS;
  return Response.json(settings, { headers: { "Cache-Control": "public, max-age=60" } });
}
