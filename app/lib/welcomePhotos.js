import { sql } from "./db";
import { shrinkPhoto } from "./personPhotos";
import { normalizedIdentity } from "./registrationRecovery.mjs";
import { initialsFor, pickPeopleMatch, pickWelcomePhoto } from "./welcomePhoto.mjs";

/**
 * The check-in welcome photo for registrations, resolved from the database.
 * Rows need id, event_id, name, email, status, deleted_at, welcome_photo and
 * welcome_photo_id; pass every live RSVP of the event that could share an
 * email, so a household email is noticed.
 * @returns {Promise<Map<string, { source: string, photoId: string|null, personId: string|null, initials: string, version: string }>>}
 */
export async function welcomePhotosFor(registrations) {
  const rows = registrations || [];
  const emails = [...new Set(rows.map((r) => normalizedIdentity(r.email)).filter(Boolean))];
  const people = emails.length ? await sql("SELECT id, kind, name, email, photo_id FROM people WHERE lower(email) = ANY($1::text[])", [emails]) : [];
  const live = rows.filter((r) => !r.deleted_at && r.status !== "cancelled");
  const result = new Map();
  for (const reg of rows) {
    const email = normalizedIdentity(reg.email);
    const sharedEmail = live.some((other) => other.id !== reg.id && other.event_id === reg.event_id && normalizedIdentity(other.email) === email);
    const match = pickPeopleMatch(reg, people, { sharedEmail });
    const { source, photoId } = pickWelcomePhoto({ choice: reg.welcome_photo, ownPhotoId: reg.welcome_photo_id, match });
    result.set(reg.id, { source, photoId, personId: match?.id || null, initials: initialsFor(reg.name), version: `${source}-${photoId || "none"}` });
  }
  return result;
}

/** One registration of one event (not deleted), or null. */
export async function welcomePhotoFor(registrationId, eventId) {
  const rows = await sql(
    `SELECT id, event_id, name, email, status, deleted_at, welcome_photo, welcome_photo_id FROM registrations
      WHERE event_id = $2 AND deleted_at IS NULL
        AND (id = $1 OR (status <> 'cancelled' AND lower(email) = (SELECT lower(email) FROM registrations WHERE id = $1)))`,
    [registrationId, eventId],
  );
  if (!rows.some((r) => r.id === registrationId)) return null;
  return (await welcomePhotosFor(rows)).get(registrationId) || null;
}

/** The picture behind a resolved welcome photo: { mime, data }, or null. */
export async function photoBytesFor(resolved) {
  if (!resolved?.photoId) return null;
  const table = resolved.source === "own" ? "registration_photos" : resolved.source === "people" ? "person_photos" : null;
  if (!table) return null;
  const [row] = await sql(`SELECT mime, data FROM ${table} WHERE id = $1`, [resolved.photoId]);
  return row || null;
}

/** Keeps a small private copy of a photo for this RSVP and makes it the welcome photo. */
export async function saveRegistrationPhoto(registrationId, dataUrl, who) {
  const small = await shrinkPhoto(dataUrl);
  if (!small) return null;
  const [row] = await sql(
    "INSERT INTO registration_photos (registration_id, mime, data, bytes, uploaded_by) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [registrationId, small.mime, small.bytes, small.bytes.length, who],
  );
  await sql("UPDATE registrations SET welcome_photo = 'own', welcome_photo_id = $1 WHERE id = $2", [row.id, registrationId]);
  return row.id;
}
