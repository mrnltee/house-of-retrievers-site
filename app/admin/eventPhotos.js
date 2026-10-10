"use server";

import { revalidatePath } from "next/cache";
import { sql } from "../lib/db";
import { actionAdmin, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { INCOMING_TRANSFORMATION, cloudinaryConfig, destroyPhoto, eventFolder, photoUrl, signParams } from "../lib/cloudinary.mjs";

/*
 * The album card in the event editor calls these directly (they return data
 * rather than redirecting). Each checks the admin's role, like every action.
 * Photos go from the browser straight to Cloudinary with a signature made
 * here, so they never pass through the site's own 4 MB request limit.
 */

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const MAX_PER_EVENT = 300;

async function allowed() {
  try {
    return { admin: await actionAdmin("events:edit") };
  } catch (error) {
    if (error instanceof Forbidden) return { error: error.message };
    throw error;
  }
}

/** What the browser needs to upload one batch to this event's folder. */
export async function signEventPhotoUpload(eventId) {
  const { error } = await allowed();
  if (error) return { error };
  const config = cloudinaryConfig();
  if (!config) return { error: "Photo storage isn't connected yet (the Cloudinary keys are missing in Vercel)." };
  if (!isUuid(eventId)) return { error: "Save the event first." };
  const [event] = await sql("SELECT id FROM events WHERE id=$1", [eventId]);
  if (!event) return { error: "That event no longer exists." };
  const [{ count }] = await sql("SELECT count(*)::int AS count FROM event_photos WHERE event_id=$1", [eventId]);
  if (count >= MAX_PER_EVENT) return { error: `This album is full (${MAX_PER_EVENT} photos). Remove some to add more.` };
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: eventFolder(eventId), timestamp, transformation: INCOMING_TRANSFORMATION };
  return {
    upload: {
      url: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      fields: { ...params, timestamp: String(timestamp), api_key: config.apiKey, signature: signParams(params, config.apiSecret) },
    },
    room: MAX_PER_EVENT - count,
  };
}

function publicPhoto(row, cloudName) {
  return {
    id: row.id,
    alt: row.alt || "",
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    thumb: photoUrl(cloudName, row.public_id, 480),
  };
}

/** Records a photo Cloudinary has just stored for this event. */
export async function addEventPhoto(eventId, uploaded) {
  const { admin, error } = await allowed();
  if (error) return { error };
  const config = cloudinaryConfig();
  if (!config || !isUuid(eventId)) return { error: "That photo couldn't be added." };
  const publicId = String(uploaded?.public_id || "");
  const width = Number(uploaded?.width);
  const height = Number(uploaded?.height);
  const bytes = Number(uploaded?.bytes);
  // Only a photo in this event's own folder, as Cloudinary described it.
  if (!publicId.startsWith(`${eventFolder(eventId)}/`) || ![width, height, bytes].every((n) => Number.isInteger(n) && n > 0)) {
    return { error: "That photo couldn't be added." };
  }
  const [{ next }] = await sql("SELECT COALESCE(max(position), 0) + 1 AS next FROM event_photos WHERE event_id=$1", [eventId]);
  const [row] = await sql(
    `INSERT INTO event_photos (event_id, public_id, width, height, bytes, uploaded_by, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (public_id) DO NOTHING RETURNING *`,
    [eventId, publicId, width, height, bytes, admin.email, next],
  );
  if (!row) return { error: "That photo is already in the album." };
  revalidatePath("/events", "layout");
  return { photo: publicPhoto(row, config.cloudName) };
}

/** Saves one photo's description (for people using screen readers). */
export async function describeEventPhoto(photoId, alt) {
  const { error } = await allowed();
  if (error) return { error };
  if (!isUuid(photoId)) return { error: "That photo no longer exists." };
  const text = String(alt || "").trim().replace(/\s+/g, " ").slice(0, 200) || null;
  const rows = await sql("UPDATE event_photos SET alt=$1 WHERE id=$2 RETURNING id", [text, photoId]);
  if (!rows.length) return { error: "That photo no longer exists." };
  revalidatePath("/events", "layout");
  return { ok: true };
}

/** Takes a photo out of the album and out of storage. */
export async function removeEventPhoto(photoId) {
  const { admin, error } = await allowed();
  if (error) return { error };
  if (!isUuid(photoId)) return { error: "That photo no longer exists." };
  const [row] = await sql(
    "SELECT p.public_id, e.title FROM event_photos p JOIN events e ON e.id = p.event_id WHERE p.id=$1",
    [photoId],
  );
  if (!row) return { ok: true };
  await sql("DELETE FROM event_photos WHERE id=$1", [photoId]);
  const gone = await destroyPhoto(row.public_id);
  if (!gone) console.warn("Cloudinary photo not removed; delete it in the Media Library", row.public_id);
  await logActivity(admin.email, "photo.remove", row.title, { publicId: row.public_id });
  revalidatePath("/events", "layout");
  return { ok: true };
}
