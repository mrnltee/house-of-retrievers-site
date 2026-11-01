import { hasDatabase, sql } from "./db";
import { EVENTS_URL } from "./eventsHost.mjs";
import { isPublicBeneficiary, publicBeneficiary } from "./beneficiaries.mjs";

/**
 * Beneficiaries the website may show (switched on, Partnered or Ended, with a
 * short line), each with the published charity events that picked it,
 * newest first. Currently supporting comes first, then by latest event.
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
    // The published charity events that picked each beneficiary (event form), newest first.
    const picks = await sql(
      `SELECT eb.beneficiary_id, e.slug, e.title, e.date FROM event_beneficiaries eb JOIN events e ON e.id = eb.event_id
        WHERE e.status = 'published' AND e.is_charity AND eb.beneficiary_id = ANY($1::uuid[]) ORDER BY e.date DESC`,
      [rows.map((r) => r.id)],
    );
    const eventsOf = (id) => picks.filter((p) => p.beneficiary_id === id).map((e) => ({ ...e, url: `${EVENTS_URL}/${e.slug}` }));
    const list = rows.map((row) => publicBeneficiary(row, eventsOf(row.id)));
    const latest = (b) => b.events[0]?.date || "";
    return list.sort((a, b) => (b.current - a.current) || latest(b).localeCompare(latest(a)) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/**
 * The beneficiaries a charity event picked, in order, for its page ("Where your
 * support goes"): who they are, never contact details. Picking them for the
 * event is what puts them there, whatever their home-page switch says.
 */
export async function beneficiariesForEvent(eventId) {
  if (!hasDatabase() || !eventId) return [];
  try {
    const rows = await sql(
      `SELECT b.* FROM event_beneficiaries eb JOIN beneficiaries b ON b.id = eb.beneficiary_id
        WHERE eb.event_id = $1 AND b.deleted_at IS NULL ORDER BY eb.position, lower(b.name)`,
      [eventId],
    );
    return rows.map((row) => {
      const { id, name, kind, location, blurb, logo, logoScale, website, instagram, facebook, tiktok, x, threads } = publicBeneficiary(row);
      return { id, name, kind, location, blurb: blurb || null, logo, logoScale, website, instagram, facebook, tiktok, x, threads };
    });
  } catch {
    return [];
  }
}
