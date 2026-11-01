import { sql } from "./db";
import { EVENTS_URL } from "./eventsHost.mjs";
import { eventBlankValues } from "./letterEvent.mjs";
import { yesBrandsByEvent } from "./eventBrandsStore";

/** An event's letter fill-ins ([Event Name], [Event Sponsors]…), or {} when it isn't found. Never throws. */
export async function eventFills(eventId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(eventId || ""))) return {};
  try {
    const [event] = await sql("SELECT id, title, slug, date, start_time, end_time, all_day, venue, venue_address, city, cost FROM events WHERE id = $1", [eventId]);
    if (!event) return {};
    const [yes, picked] = await Promise.all([
      yesBrandsByEvent([event.id]),
      sql(`SELECT b.name FROM event_beneficiaries eb JOIN beneficiaries b ON b.id = eb.beneficiary_id
            WHERE eb.event_id = $1 AND b.deleted_at IS NULL ORDER BY eb.position, lower(b.name)`, [event.id]),
    ]);
    const brands = yes[event.id] || [];
    return eventBlankValues(event, {
      partners: brands.filter((b) => b.role === "Partner").map((b) => b.name),
      sponsors: brands.filter((b) => b.role === "Sponsor").map((b) => b.name),
      beneficiaries: picked.map((b) => b.name),
      link: event.slug ? `${EVENTS_URL}/${event.slug}` : "",
    });
  } catch {
    return {};
  }
}
