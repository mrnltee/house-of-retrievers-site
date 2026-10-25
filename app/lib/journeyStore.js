import { hasDatabase, sql } from "./db";
import { cloudinaryConfig, photoUrl } from "./cloudinary.mjs";
import { manilaDate, sortEntries, toStop } from "./journeyEntries.mjs";
import { journey as fallback } from "../content/journey";

/** Where a journey photo row's picture is: Cloudinary, public/journey, or the linked event's album. */
export function journeyPhotoSrc(photo, cloudName, width = 1000) {
  if (photo.static_src) return photo.static_src;
  const publicId = photo.public_id || photo.album_public_id;
  return publicId && cloudName ? photoUrl(cloudName, publicId, width) : null;
}

/**
 * The published "Our journey" stops for the homepage (journey_entries,
 * migration 054), in the shape Journey.jsx renders. Falls back to the old
 * app/content/journey.js when there's no database or the table isn't there
 * yet, so the homepage never breaks.
 */
export async function loadJourney() {
  if (!hasDatabase()) return fallback;
  try {
    const rows = await sql(
      `SELECT j.*, e.slug AS event_slug, e.status AS event_status
         FROM journey_entries j LEFT JOIN events e ON e.id = j.event_id
        WHERE j.status = 'published'`,
    );
    if (!rows.length) return [];
    const photos = await sql(
      `SELECT p.entry_id, p.public_id, p.static_src, ep.public_id AS album_public_id,
              COALESCE(NULLIF(p.alt, ''), ep.alt, '') AS alt, p.fit
         FROM journey_entry_photos p
         LEFT JOIN event_photos ep ON ep.id = p.event_photo_id
        WHERE p.entry_id = ANY($1::uuid[])
        ORDER BY p.position, p.created_at`,
      [rows.map((r) => r.id)],
    );
    const cloudName = cloudinaryConfig()?.cloudName;
    const today = manilaDate();
    return sortEntries(rows).map((row) => toStop(
      row,
      photos.filter((p) => p.entry_id === row.id)
        .map((p) => ({ src: journeyPhotoSrc(p, cloudName), alt: p.alt, fit: p.fit }))
        .filter((p) => p.src),
      today,
    ));
  } catch (error) {
    if (error?.code !== "42P01") console.error("journey entries unavailable, using the built-in timeline:", error.message);
    return fallback;
  }
}
