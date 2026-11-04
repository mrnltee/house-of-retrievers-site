import { sql } from "./db";
import { socialLinks } from "./socials.mjs";

const COLUMNS = "id, name, photo, bio, website, instagram, facebook, tiktok, x_profile, threads, show_on_site, notes, created_at, updated_at";

export async function listPhotographers() {
  return sql(`SELECT ${COLUMNS}, (SELECT count(*)::int FROM event_photographers ep WHERE ep.photographer_id = p.id) AS events FROM photographers p WHERE deleted_at IS NULL ORDER BY lower(name)`);
}

export async function loadPhotographer(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) return null;
  const [row] = await sql(`SELECT ${COLUMNS} FROM photographers WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return row || null;
}

/** The photographers credited on an event (admin picker), in order. */
export async function eventPhotographerIds(eventId) {
  const rows = await sql("SELECT photographer_id FROM event_photographers WHERE event_id = $1 ORDER BY position", [eventId]);
  return rows.map((r) => r.photographer_id);
}

/** "Photos by" on the website: credited photographers that are shown on the site, with their links. */
export async function photographersForEvent(eventId) {
  const rows = await sql(
    `SELECT p.id, p.name, p.photo, p.bio, p.website, p.instagram, p.facebook, p.tiktok, p.x_profile, p.threads
       FROM event_photographers ep JOIN photographers p ON p.id = ep.photographer_id
      WHERE ep.event_id = $1 AND p.deleted_at IS NULL AND p.show_on_site
      ORDER BY ep.position, lower(p.name)`,
    [eventId],
  );
  return rows.map((p) => ({ id: p.id, name: p.name, photo: p.photo, bio: p.bio, links: socialLinks({ ...p, x: p.x_profile }) }));
}
