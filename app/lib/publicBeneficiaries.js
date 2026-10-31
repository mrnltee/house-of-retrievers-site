import { hasDatabase, sql } from "./db";
import { EVENTS_URL } from "./eventsHost.mjs";
import { eventsFor, isPublicBeneficiary, publicBeneficiary } from "./beneficiaries.mjs";

/**
 * Beneficiaries the website may show (switched on, Partnered or Ended, with a
 * short line), each with the published charity events that name it in
 * "Supports", newest first. Currently supporting comes first, then by latest event.
 * Empty without a database, so the home page leaves the section out.
 */
export async function loadPublicBeneficiaries() {
  if (!hasDatabase()) return [];
  try {
    const rows = (await sql(
      `SELECT * FROM beneficiaries WHERE deleted_at IS NULL AND show_on_site
         AND status IN ('partnered', 'ended') AND coalesce(blurb, '') <> '' ORDER BY name`,
    )).filter(isPublicBeneficiary);
    if (!rows.length) return [];
    const events = (await sql(
      `SELECT slug, title, date, supports FROM events
        WHERE status = 'published' AND is_charity AND coalesce(supports, '') <> ''
        ORDER BY date DESC LIMIT 300`,
    )).map((e) => ({ ...e, url: `${EVENTS_URL}/${e.slug}` }));
    const list = rows.map((row) => publicBeneficiary(row, eventsFor(row.name, events)));
    const latest = (b) => b.events[0]?.date || "";
    return list.sort((a, b) => (b.current - a.current) || latest(b).localeCompare(latest(a)) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
