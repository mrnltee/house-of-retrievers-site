"use server";

import { revalidatePath } from "next/cache";
import { sql, transaction } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { INCOMING_TRANSFORMATION, cloudinaryConfig, destroyPhoto, journeyFolder, photoUrl, signParams } from "../lib/cloudinary.mjs";
import { MAX_JOURNEY_PHOTOS, cleanAlt, cleanEntry, slugifyEntry } from "../lib/journeyEntries.mjs";

/*
 * Journey entries (admin → Settings → Journey timeline, media:edit). The
 * entry forms redirect back with a message, like the other admin forms; the
 * photo calls return data for the photo panel, like the event album
 * (app/admin/eventPhotos.js). Every change refreshes the homepage.
 */

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const field = (data, key) => String(data.get(key) ?? "");
const entryPage = (id) => `/journey/${id}`;

async function allowed() {
  try {
    return { admin: await actionAdmin("media:edit") };
  } catch (error) {
    if (error instanceof Forbidden) return { error: error.message };
    throw error;
  }
}

/** A slug no other stop uses: "retriever-romp", "retriever-romp-2", … */
async function freeSlug(title) {
  const base = slugifyEntry(title);
  const taken = new Set((await sql("SELECT slug FROM journey_entries WHERE slug = $1 OR slug LIKE $2", [base, `${base}-%`])).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

const refresh = () => revalidatePath("/");

/** New stop from an event: title, date, venue and summary copied in (the date then follows the event). Starts as a draft. */
export async function createJourneyFromEvent(data) {
  const admin = await actionAdmin("media:edit");
  const eventId = field(data, "eventId");
  if (!isUuid(eventId)) await backWith("/journey", "error", "Pick an event first.");
  const [event] = await sql("SELECT id, title, date, venue, city, summary FROM events WHERE id=$1", [eventId]);
  if (!event) await backWith("/journey", "error", "That event no longer exists.");
  const [linked] = await sql("SELECT id FROM journey_entries WHERE event_id=$1", [eventId]);
  if (linked) await backWith(entryPage(linked.id), "error", "That event is already on the timeline — here it is.");
  const { value } = cleanEntry({
    title: event.title,
    place: [event.venue, event.city].filter(Boolean).join(", "),
    story: event.summary,
    date: String(event.date instanceof Date ? event.date.toISOString() : event.date).slice(0, 10),
  });
  const [row] = await sql(
    `INSERT INTO journey_entries (slug, event_id, title, place, story, happened_on, status, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7) RETURNING id`,
    [await freeSlug(value.title), eventId, value.title, value.place, value.story, value.date, admin.email],
  );
  await logActivity(admin.email, "journey.entry.create", value.title, { from: "event", eventId });
  await backWith(entryPage(row.id), "ok", "Added as a draft. Check the wording and photos, then publish.");
}

/** New standalone stop (a milestone, or anything without an event). Starts as a draft. */
export async function createJourneyMilestone(data) {
  const admin = await actionAdmin("media:edit");
  const { value, error } = cleanEntry({ title: field(data, "title"), date: field(data, "date"), mark: field(data, "mark") || "milestone" });
  if (error) await backWith("/journey", "error", error);
  const [row] = await sql(
    `INSERT INTO journey_entries (slug, title, mark, happened_on, status, updated_by)
     VALUES ($1, $2, $3, $4, 'draft', $5) RETURNING id`,
    [await freeSlug(value.title), value.title, value.mark, value.date, admin.email],
  );
  await logActivity(admin.email, "journey.entry.create", value.title, { from: "milestone" });
  await backWith(entryPage(row.id), "ok", "Added as a draft. Fill in the details, then publish.");
}

/** Saves a stop's wording and date. A linked stop's date follows its event, so it isn't changed here. */
export async function updateJourneyEntry(data) {
  const admin = await actionAdmin("media:edit");
  const id = field(data, "id");
  if (!isUuid(id)) await backWith("/journey", "error", "That stop no longer exists.");
  const [current] = await sql("SELECT id, event_id, happened_on, month FROM journey_entries WHERE id=$1", [id]);
  if (!current) await backWith("/journey", "error", "That stop no longer exists.");
  const { value, error } = cleanEntry({
    title: field(data, "title"), theme: field(data, "theme"), place: field(data, "place"),
    story: field(data, "story"), tag: field(data, "tag"), mark: field(data, "mark"), date: field(data, "date"),
  });
  if (error) await backWith(entryPage(id), "error", error);
  const dateSent = data.has("date") && !current.event_id;
  await sql(
    `UPDATE journey_entries SET title=$1, theme=$2, place=$3, story=$4, tag=$5, mark=$6,
       happened_on = CASE WHEN $7 THEN $8::date ELSE happened_on END,
       month = CASE WHEN $7 THEN NULL ELSE month END,
       updated_by=$9, updated_at=now()
     WHERE id=$10`,
    [value.title, value.theme, value.place, value.story, value.tag, value.mark, dateSent, value.date, admin.email, id],
  );
  await logActivity(admin.email, "journey.entry.update", value.title, { id });
  refresh();
  await backWith(entryPage(id), "ok", "Saved.");
}

/** Publish or hide a stop. */
export async function setJourneyEntryStatus(data) {
  const admin = await actionAdmin("media:edit");
  const id = field(data, "id");
  const status = field(data, "status") === "published" ? "published" : "draft";
  if (!isUuid(id)) await backWith("/journey", "error", "That stop no longer exists.");
  const [row] = await sql("UPDATE journey_entries SET status=$1, updated_by=$2, updated_at=now() WHERE id=$3 RETURNING title", [status, admin.email, id]);
  if (!row) await backWith("/journey", "error", "That stop no longer exists.");
  await logActivity(admin.email, status === "published" ? "journey.entry.publish" : "journey.entry.unpublish", row.title, { id });
  refresh();
  await backWith(entryPage(id), "ok", status === "published" ? "Published — it's on the homepage now." : "Hidden from the homepage.");
}

/** Deletes a stop, and the photos uploaded for it (album photos and files in public/ stay). */
export async function deleteJourneyEntry(data) {
  const admin = await actionAdmin("media:edit");
  const id = field(data, "id");
  if (!isUuid(id)) await backWith("/journey", "error", "That stop no longer exists.");
  if (field(data, "confirm") !== "on") await backWith(entryPage(id), "error", "Tick the box to confirm you want to delete this stop.");
  const [row] = await sql("SELECT title FROM journey_entries WHERE id=$1", [id]);
  if (!row) await backWith("/journey", "error", "That stop no longer exists.");
  const uploaded = await sql("SELECT public_id FROM journey_entry_photos WHERE entry_id=$1 AND public_id IS NOT NULL", [id]);
  await sql("DELETE FROM journey_entries WHERE id=$1", [id]);
  for (const { public_id: publicId } of uploaded) {
    if (!(await destroyPhoto(publicId))) console.warn("Cloudinary photo not removed; delete it in the Media Library", publicId);
  }
  await logActivity(admin.email, "journey.entry.delete", row.title, { id });
  refresh();
  await backWith("/journey", "ok", `Deleted "${row.title}".`);
}

// ---------- Photos (called from the photo panel; they return data) ----------

async function photoCount(entryId) {
  const [{ count }] = await sql("SELECT count(*)::int AS count FROM journey_entry_photos WHERE entry_id=$1", [entryId]);
  return count;
}

function publicPhoto(row, cloudName) {
  const publicId = row.public_id || row.album_public_id;
  return {
    id: row.id,
    alt: row.alt || "",
    fit: row.fit,
    source: row.public_id ? "upload" : row.static_src ? "file" : "album",
    thumb: row.static_src || (publicId && cloudName ? photoUrl(cloudName, publicId, 480) : null),
  };
}

/** All of a stop's photos, in order, for the photo panel. */
export async function listJourneyPhotos(entryId) {
  const { error } = await allowed();
  if (error) return { error };
  if (!isUuid(entryId)) return { error: "That stop no longer exists." };
  const rows = await sql(
    `SELECT p.*, ep.public_id AS album_public_id FROM journey_entry_photos p
       LEFT JOIN event_photos ep ON ep.id = p.event_photo_id
      WHERE p.entry_id=$1 ORDER BY p.position, p.created_at`,
    [entryId],
  );
  return { photos: rows.map((r) => publicPhoto(r, cloudinaryConfig()?.cloudName)), max: MAX_JOURNEY_PHOTOS };
}

/** What the browser needs to upload one batch to this stop's folder. */
export async function signJourneyPhotoUpload(entryId) {
  const { error } = await allowed();
  if (error) return { error };
  const config = cloudinaryConfig();
  if (!config) return { error: "Photo storage isn't connected yet (the Cloudinary keys are missing in Vercel)." };
  if (!isUuid(entryId)) return { error: "That stop no longer exists." };
  const [entry] = await sql("SELECT id FROM journey_entries WHERE id=$1", [entryId]);
  if (!entry) return { error: "That stop no longer exists." };
  const count = await photoCount(entryId);
  if (count >= MAX_JOURNEY_PHOTOS) return { error: `This stop has ${MAX_JOURNEY_PHOTOS} photos, the most it can show. Remove one to add another.` };
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: journeyFolder(entryId), timestamp, transformation: INCOMING_TRANSFORMATION };
  return {
    upload: {
      url: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      fields: { ...params, timestamp: String(timestamp), api_key: config.apiKey, signature: signParams(params, config.apiSecret) },
    },
    room: MAX_JOURNEY_PHOTOS - count,
  };
}

/** Records a photo Cloudinary has just stored for this stop. */
export async function addJourneyPhoto(entryId, uploaded) {
  const { admin, error } = await allowed();
  if (error) return { error };
  const config = cloudinaryConfig();
  if (!config || !isUuid(entryId)) return { error: "That photo couldn't be added." };
  const publicId = String(uploaded?.public_id || "");
  const [width, height, bytes] = [uploaded?.width, uploaded?.height, uploaded?.bytes].map(Number);
  // Only a photo in this stop's own folder, as Cloudinary described it.
  if (!publicId.startsWith(`${journeyFolder(entryId)}/`) || ![width, height, bytes].every((n) => Number.isInteger(n) && n > 0)) {
    return { error: "That photo couldn't be added." };
  }
  // Lock the stop so two uploads finishing together can't both squeeze past the limit.
  const result = await transaction(async (tx) => {
    const [entry] = await tx.sql("SELECT id FROM journey_entries WHERE id=$1 FOR UPDATE", [entryId]);
    if (!entry) return { error: "That stop no longer exists." };
    const [{ count, next }] = await tx.sql("SELECT count(*)::int AS count, COALESCE(max(position), -1) + 1 AS next FROM journey_entry_photos WHERE entry_id=$1", [entryId]);
    if (count >= MAX_JOURNEY_PHOTOS) return { full: true };
    const [row] = await tx.sql(
      `INSERT INTO journey_entry_photos (entry_id, public_id, width, height, bytes, position, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (public_id) DO NOTHING RETURNING *`,
      [entryId, publicId, width, height, bytes, next, admin.email],
    );
    return row ? { row } : { error: "That photo is already on this stop." };
  });
  if (result.full) {
    await destroyPhoto(publicId);
    return { error: `This stop already has ${MAX_JOURNEY_PHOTOS} photos.` };
  }
  if (result.error) return { error: result.error };
  const row = result.row;
  await logActivity(admin.email, "journey.photo.add", entryId, { publicId });
  refresh();
  return { photo: publicPhoto(row, config.cloudName) };
}

/** The linked event's album photos that aren't on this stop yet, to pick from. */
export async function eventAlbumForJourney(entryId) {
  const { error } = await allowed();
  if (error) return { error };
  if (!isUuid(entryId)) return { error: "That stop no longer exists." };
  const [entry] = await sql("SELECT event_id FROM journey_entries WHERE id=$1", [entryId]);
  if (!entry?.event_id) return { photos: [] };
  const rows = await sql(
    `SELECT ep.id, ep.public_id, ep.alt FROM event_photos ep
      WHERE ep.event_id=$1 AND ep.status='approved'
        AND NOT EXISTS (SELECT 1 FROM journey_entry_photos p WHERE p.entry_id=$2 AND p.event_photo_id=ep.id)
      ORDER BY ep.position, ep.created_at`,
    [entry.event_id, entryId],
  );
  const cloudName = cloudinaryConfig()?.cloudName;
  return { photos: rows.map((r) => ({ id: r.id, alt: r.alt || "", thumb: cloudName ? photoUrl(cloudName, r.public_id, 320) : null })) };
}

/** Puts chosen album photos on the stop. They stay the album's: removing them here never deletes them. */
export async function borrowEventPhotos(entryId, eventPhotoIds) {
  const { admin, error } = await allowed();
  if (error) return { error };
  const ids = (Array.isArray(eventPhotoIds) ? eventPhotoIds : []).filter(isUuid).slice(0, MAX_JOURNEY_PHOTOS);
  if (!isUuid(entryId) || !ids.length) return { error: "Pick at least one photo." };
  const added = await transaction(async (tx) => {
    // Locked like addJourneyPhoto, so the limit holds when several adds overlap.
    await tx.sql("SELECT id FROM journey_entries WHERE id=$1 FOR UPDATE", [entryId]);
    const [{ count, next }] = await tx.sql("SELECT count(*)::int AS count, COALESCE(max(position), -1) + 1 AS next FROM journey_entry_photos WHERE entry_id=$1", [entryId]);
    const room = MAX_JOURNEY_PHOTOS - count;
    if (room <= 0) return null;
    // Only photos from this stop's own linked event.
    return tx.sql(
      `INSERT INTO journey_entry_photos (entry_id, event_photo_id, position, uploaded_by)
       SELECT $1, ep.id, $3 + row_number() OVER (ORDER BY ep.position, ep.created_at) - 1, $4
         FROM event_photos ep JOIN journey_entries j ON j.id = $1 AND j.event_id = ep.event_id
        WHERE ep.id = ANY($2::uuid[]) AND ep.status = 'approved'
        ORDER BY ep.position, ep.created_at
        LIMIT $5
       ON CONFLICT (entry_id, event_photo_id) DO NOTHING RETURNING id`,
      [entryId, ids, next, admin.email, room],
    );
  });
  if (!added) return { error: `This stop already has ${MAX_JOURNEY_PHOTOS} photos.` };
  await logActivity(admin.email, "journey.photo.add", entryId, { fromAlbum: added.length });
  refresh();
  return { added: added.length };
}

/** Saves a photo's description and whether it shows whole (a poster) or fills the card. */
export async function describeJourneyPhoto(photoId, alt, fit) {
  const { error } = await allowed();
  if (error) return { error };
  if (!isUuid(photoId)) return { error: "That photo no longer exists." };
  const rows = await sql(
    "UPDATE journey_entry_photos SET alt=$1, fit=$2 WHERE id=$3 RETURNING id",
    [cleanAlt(alt), fit === "contain" ? "contain" : "cover", photoId],
  );
  if (!rows.length) return { error: "That photo no longer exists." };
  refresh();
  return { ok: true };
}

/** Moves a photo one place earlier (-1) or later (+1). */
export async function moveJourneyPhoto(photoId, direction) {
  const { error } = await allowed();
  if (error) return { error };
  if (!isUuid(photoId) || ![-1, 1].includes(direction)) return { error: "That photo can't move that way." };
  await transaction(async (tx) => {
    const [photo] = await tx.sql("SELECT entry_id FROM journey_entry_photos WHERE id=$1", [photoId]);
    if (!photo) return;
    const order = (await tx.sql("SELECT id FROM journey_entry_photos WHERE entry_id=$1 ORDER BY position, created_at", [photo.entry_id])).map((r) => r.id);
    const from = order.indexOf(photoId);
    const to = from + direction;
    if (to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    for (const [position, id] of order.entries()) await tx.sql("UPDATE journey_entry_photos SET position=$1 WHERE id=$2", [position, id]);
  });
  refresh();
  return { ok: true };
}

/** Takes a photo off the stop. An uploaded one is deleted from storage too; album photos and files stay. */
export async function removeJourneyPhoto(photoId) {
  const { admin, error } = await allowed();
  if (error) return { error };
  if (!isUuid(photoId)) return { error: "That photo no longer exists." };
  const [row] = await sql("DELETE FROM journey_entry_photos WHERE id=$1 RETURNING entry_id, public_id, static_src, event_photo_id", [photoId]);
  if (!row) return { ok: true };
  if (row.public_id && !(await destroyPhoto(row.public_id))) console.warn("Cloudinary photo not removed; delete it in the Media Library", row.public_id);
  await logActivity(admin.email, "journey.photo.remove", row.entry_id, { publicId: row.public_id, file: row.static_src, albumPhoto: row.event_photo_id });
  refresh();
  return { ok: true };
}
