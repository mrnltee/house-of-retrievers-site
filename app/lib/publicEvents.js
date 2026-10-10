import { events as contentEvents } from "../content/events";
import { hasDatabase, sql } from "./db";
import { toPublicEvent } from "./admin/events.mjs";
import { cloudinaryConfig, photoUrl } from "./cloudinary.mjs";

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

/** The current slug for an event's old web address, or null. */
export async function currentSlugFor(oldSlug) {
  if (!hasDatabase() || !/^[a-z0-9-]{1,120}$/.test(String(oldSlug || ""))) return null;
  try {
    const [row] = await sql(
      "SELECT e.slug FROM event_slug_redirects r JOIN events e ON e.id = r.event_id WHERE r.old_slug = $1 AND e.status <> 'draft'",
      [oldSlug],
    );
    return row?.slug || null;
  } catch {
    return null;
  }
}

/** An event's approved album photos, sized for the grid and for full screen. */
export async function loadEventPhotos(slug) {
  const config = cloudinaryConfig();
  if (!config || !hasDatabase() || !/^[a-z0-9-]{1,120}$/.test(String(slug || ""))) return [];
  try {
    const rows = await sql(
      `SELECT p.public_id, p.alt, p.width, p.height FROM event_photos p JOIN events e ON e.id = p.event_id
        WHERE e.slug = $1 AND p.status = 'approved' ORDER BY p.position, p.created_at`,
      [slug],
    );
    return rows.map((row) => ({
      thumb: photoUrl(config.cloudName, row.public_id, 640),
      full: photoUrl(config.cloudName, row.public_id, 1800),
      alt: row.alt || "",
      width: row.width,
      height: row.height,
    }));
  } catch {
    return [];
  }
}
