import { sql } from "./db";

/** Longest side of the copy kept for the admin; the full photo stays in Drive. */
const EDGE = 480;
/** Without sharp (it ships with Next.js, but just in case), keep the upload only if it's this small. */
const RAW_LIMIT = 900 * 1024;

/**
 * Stores a small copy of a Join-form photo (a data URL) for one person and
 * points the person at it. Best effort: returns null rather than throwing.
 */
export async function savePersonPhoto(personId, dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  let bytes = Buffer.from(match[2], "base64");
  let mime = match[1];
  try {
    const { default: sharp } = await import("sharp");
    bytes = await sharp(bytes).rotate().resize(EDGE, EDGE, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    mime = "image/webp";
  } catch {
    if (bytes.length > RAW_LIMIT) return null;
  }
  const [row] = await sql(
    "INSERT INTO person_photos (person_id, mime, data, bytes) VALUES ($1, $2, $3, $4) RETURNING id",
    [personId, mime, bytes, bytes.length],
  );
  await sql("UPDATE people SET photo_id = $1 WHERE id = $2", [row.id, personId]);
  return row.id;
}
