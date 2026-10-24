import { hasDatabase, sql } from "./db";
import { DEFAULT_JOURNEY_SETTINGS, cleanJourneyOrientation, cleanJourneyShow } from "./journeySettings.mjs";

/** The homepage "Our journey" settings from journey_settings (migration 053), or today's default. */
export async function loadJourneySettings() {
  if (!hasDatabase()) return DEFAULT_JOURNEY_SETTINGS;
  try {
    const [row] = await sql("SELECT show, orientation FROM journey_settings WHERE id=true");
    return row ? { show: cleanJourneyShow(row.show), orientation: cleanJourneyOrientation(row.orientation) } : DEFAULT_JOURNEY_SETTINGS;
  } catch {
    // Table not there yet (migration not applied) or the database is unreachable: keep the homepage up.
    return DEFAULT_JOURNEY_SETTINGS;
  }
}
