import { sql } from "../db";

/** Largest stored picture (the browser shrinks it first; see ImageField.jsx). */
const MAX_IMAGE_BYTES = 700 * 1024;
const OWN_IMAGE = /^\/api\/event-image\/[0-9a-f-]{36}$/;

/**
 * A picture field from an ImageField form: a new upload (`<name>Data`, a data URL)
 * is stored in event_images like sponsor logos; `<name>Remove` clears it; else the
 * current address is kept. Returns { url } (null = none) or { error }.
 */
export async function pictureFrom(data, name, adminEmail) {
  const get = (key) => (typeof data.get(key) === "string" ? data.get(key) : "");
  const upload = get(`${name}Data`);
  if (upload) {
    const match = upload.match(/^data:(image\/(?:png|webp|jpeg));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return { error: "That picture didn't come through. Try a PNG or JPG." };
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > MAX_IMAGE_BYTES) return { error: "That picture is too large. Try a smaller file." };
    const [saved] = await sql("INSERT INTO event_images (mime, data, bytes, created_by) VALUES ($1, $2, $3, $4) RETURNING id", [match[1], bytes, bytes.length, adminEmail]);
    return { url: `/api/event-image/${saved.id}` };
  }
  if (get(`${name}Remove`)) return { url: null };
  const current = get(name);
  return { url: OWN_IMAGE.test(current) ? current : null };
}
