import { events as contentEvents } from "../content/events";
import { hasDatabase, sql } from "./db";
import { toPublicEvent } from "./admin/events.mjs";

export function manilaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

const PUBLIC_EVENTS = `SELECT e.*, (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') AS confirmed
  FROM events e WHERE e.status IN ('published', 'cancelled')`;

/**
 * Published events from the admin once its database is connected; until then,
 * the hand-edited list in app/content/events.js.
 */
export async function loadEvents() {
  if (!hasDatabase()) return contentEvents;
  try {
    const rows = await sql(`${PUBLIC_EVENTS} ORDER BY e.date`);
    return rows.map((row) => toPublicEvent(row, row.confirmed));
  } catch {
    return contentEvents;
  }
}

/** One public event by its slug, or null. */
export async function loadEvent(slug) {
  if (!/^[a-z0-9-]{1,120}$/.test(String(slug || ""))) return null;
  if (!hasDatabase()) return contentEvents.find((event) => event.slug === slug) || null;
  try {
    const [row] = await sql(`${PUBLIC_EVENTS} AND e.slug = $1`, [slug]);
    return row ? toPublicEvent(row, row.confirmed) : null;
  } catch {
    return null;
  }
}
