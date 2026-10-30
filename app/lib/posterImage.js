import sharp from "sharp";
import { sql } from "./db";
import { HOME_URL } from "./siteSeo.mjs";
import { isPosterSize, POSTER_WIDTH, posterWindow } from "./posterFrame.mjs";

const MAX_BYTES = 700 * 1024;

/** A saved event picture as { data, mime }: one of ours from event_images, else fetched. */
export async function loadPicture(src) {
  const own = String(src || "").match(/^\/api\/event-image\/([0-9a-f-]{36})$/i);
  if (own) {
    const [row] = await sql("SELECT mime, data FROM event_images WHERE id = $1", [own[1]]);
    return row?.data ? { data: Buffer.from(row.data), mime: row.mime } : null;
  }
  const url = /^https:\/\//.test(src) ? src : String(src || "").startsWith("/") ? `${HOME_URL}${src}` : null;
  if (!url) return null;
  const res = await fetch(url);
  return res.ok ? { data: Buffer.from(await res.arrayBuffer()), mime: res.headers.get("content-type") || "image/jpeg" } : null;
}

/**
 * An event's poster at 4:5: the cover as saved when it already is, else cut from
 * the kept original (or the cover itself) around the old crop's centre.
 * Returns { data, mime, framed } or null; `area` and `size` say where it was cut.
 */
export async function posterFor(event) {
  const current = await loadPicture(event.image);
  const meta = current ? await sharp(current.data).metadata() : null;
  if (meta && isPosterSize(meta.width, meta.height)) return { ...current, framed: false };
  const usesSource = Boolean(event.image_source);
  const picture = usesSource ? await loadPicture(event.image_source) : current;
  if (!picture) return null;
  const rotated = await sharp(picture.data).rotate().toBuffer();
  const size = await sharp(rotated).metadata();
  const crop = usesSource && event.image_crop && typeof event.image_crop === "object" ? event.image_crop : {};
  const area = posterWindow(size.width, size.height, crop);
  let quality = 85;
  let data;
  do {
    data = await sharp(rotated).extract(area).resize({ width: Math.min(POSTER_WIDTH, area.width) }).jpeg({ quality, mozjpeg: true }).toBuffer();
    quality -= 10;
  } while (data.length > MAX_BYTES && quality >= 45);
  return { data, mime: "image/jpeg", framed: true, area, size };
}
