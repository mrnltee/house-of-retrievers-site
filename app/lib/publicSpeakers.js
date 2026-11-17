import { hasDatabase, sql } from "./db";
import { isPublicSpeaker, publicSpeaker, sortSpeakers } from "./eventSpeakers.mjs";

/**
 * Speakers and special guests for an event page: guests on its Guest list that HoR switched on and who
 * replied Coming. Only the public fields are selected, so contact details never leave the database.
 * Empty without a database or on any error, so the page simply leaves the section out.
 */
export async function speakersForEvent(eventId) {
  if (!hasDatabase() || !eventId) return [];
  try {
    const rows = await sql(
      `SELECT eg.contact_id, c.name, eg.reply, eg.show_on_site, eg.public_role, eg.public_intro, eg.public_photo, eg.public_link
         FROM event_guests eg JOIN letter_contacts c ON c.id = eg.contact_id
        WHERE eg.event_id = $1 AND eg.show_on_site AND eg.reply = 'yes' AND c.deleted_at IS NULL`,
      [eventId],
    );
    return sortSpeakers(rows.filter(isPublicSpeaker).map(publicSpeaker));
  } catch {
    return [];
  }
}
