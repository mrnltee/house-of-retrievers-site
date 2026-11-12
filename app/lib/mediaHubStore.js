import { hasDatabase, sql } from "./db";
import { cloudinaryConfig, photoUrl } from "./cloudinary.mjs";
import { EVENTS_URL } from "./eventsHost.mjs";

/** The published media hub wording, or {} when there is none (no database, or still a draft). */
export async function loadPublishedMediaContent() {
  if (!hasDatabase()) return {};
  try {
    const [document] = await sql("SELECT content FROM media_hub_documents WHERE id=true AND status='published'");
    return document?.content && typeof document.content === "object" ? document.content : {};
  } catch {
    return {};
  }
}

const PER_ALBUM = 6;
const MAX_ALBUMS = 8;

/**
 * Past events' approved album photos for the media hub's photo library, newest event first.
 * Only credited work is shown: an album appears when the event has a photographer under
 * "Photos by" (shown on the site) or the photo carries its own credit. Uncredited photos are left out.
 */
export async function loadMediaAlbums() {
  const config = cloudinaryConfig();
  if (!config || !hasDatabase()) return [];
  try {
    const rows = await sql(
      `SELECT e.id, e.title, e.slug, e.date, p.public_id, p.alt, p.credit,
              (SELECT string_agg(ph.name, ', ' ORDER BY ep.position, lower(ph.name))
                 FROM event_photographers ep JOIN photographers ph ON ph.id = ep.photographer_id
                WHERE ep.event_id = e.id AND ph.deleted_at IS NULL AND ph.show_on_site) AS photographers
         FROM events e JOIN event_photos p ON p.event_id = e.id
        WHERE e.status = 'published' AND p.status = 'approved'
        ORDER BY e.date DESC, p.position, p.created_at`,
    );
    const albums = new Map();
    for (const row of rows) {
      const credit = String(row.credit || "").trim() || String(row.photographers || "").trim();
      if (!credit) continue;
      if (!albums.has(row.id)) {
        if (albums.size >= MAX_ALBUMS) continue;
        albums.set(row.id, { title: row.title, date: row.date, url: `${EVENTS_URL}/${row.slug}`, photographers: String(row.photographers || "").trim(), total: 0, photos: [] });
      }
      const album = albums.get(row.id);
      album.total += 1;
      if (album.photos.length < PER_ALBUM) {
        album.photos.push({ thumb: photoUrl(config.cloudName, row.public_id, 640), full: photoUrl(config.cloudName, row.public_id, 1800), alt: row.alt || "", credit });
      }
    }
    return [...albums.values()];
  } catch {
    return [];
  }
}
