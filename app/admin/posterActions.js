"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { HOME_URL } from "../lib/siteSeo.mjs";

/** Posters are 4:5 (owner, 2026-10-27); saved at most 1200 × 1500, like the admin cropper. */
const RATIO = 4 / 5;
const OUTPUT_WIDTH = 1200;
const MAX_BYTES = 700 * 1024;

async function loadPicture(src) {
  const own = String(src || "").match(/^\/api\/event-image\/([0-9a-f-]{36})$/i);
  if (own) {
    const [row] = await sql("SELECT data FROM event_images WHERE id = $1", [own[1]]);
    return row?.data ? Buffer.from(row.data) : null;
  }
  const url = /^https:\/\//.test(src) ? src : String(src || "").startsWith("/") ? `${HOME_URL}${src}` : null;
  if (!url) return null;
  const res = await fetch(url);
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

/** The 4:5 window around the old crop's centre (x, y as shares of the picture), as large as fits. */
function posterWindow(width, height, centre = {}) {
  const w = Math.min(width, Math.round(height * RATIO));
  const h = Math.round(w / RATIO);
  const cx = Number.isFinite(centre.x) ? centre.x * width : width / 2;
  const cy = Number.isFinite(centre.y) ? centre.y * height : height / 2;
  const left = Math.round(Math.min(width - w, Math.max(0, cx - w / 2)));
  const top = Math.round(Math.min(height - h, Math.max(0, cy - h / 2)));
  return { left, top, width: w, height: h };
}

/**
 * Re-frames every event poster that isn't 4:5 yet, from the kept original
 * (else the current poster), centred where the old crop was. Each can be
 * fine-tuned afterwards in the event's cropper.
 */
export async function reframePosters() {
  try {
    const admin = await actionAdmin("events:edit");
    const events = await sql("SELECT id, title, image, image_source, image_crop FROM events WHERE image IS NOT NULL AND image <> ''");
    let done = 0;
    let already = 0;
    const failed = [];
    for (const event of events) {
      try {
        const current = await loadPicture(event.image);
        const meta = current ? await sharp(current).metadata() : null;
        if (meta && Math.abs(meta.width / meta.height - RATIO) < 0.01) { already += 1; continue; }
        const usesSource = Boolean(event.image_source);
        const picture = usesSource ? await loadPicture(event.image_source) : current;
        if (!picture) { failed.push(event.title); continue; }
        const rotated = await sharp(picture).rotate().toBuffer();
        const size = await sharp(rotated).metadata();
        const crop = usesSource && event.image_crop && typeof event.image_crop === "object" ? event.image_crop : {};
        const area = posterWindow(size.width, size.height, crop);
        let quality = 85;
        let out;
        do {
          out = await sharp(rotated).extract(area).resize({ width: Math.min(OUTPUT_WIDTH, area.width) }).jpeg({ quality, mozjpeg: true }).toBuffer();
          quality -= 10;
        } while (out.length > MAX_BYTES && quality >= 45);
        const [saved] = await sql("INSERT INTO event_images (mime, data, bytes, created_by) VALUES ('image/jpeg', $1, $2, $3) RETURNING id", [out, out.length, admin.email]);
        await sql(
          "UPDATE events SET image = $1, image_crop = CASE WHEN image_source IS NOT NULL THEN $2::jsonb ELSE image_crop END, updated_at = now() WHERE id = $3",
          [`/api/event-image/${saved.id}`, JSON.stringify({ zoom: 1, x: (area.left + area.width / 2) / size.width, y: (area.top + area.height / 2) / size.height }), event.id],
        );
        done += 1;
      } catch {
        failed.push(event.title);
      }
    }
    await logActivity(admin.email, "event.posters.reframe", `${done} re-framed`, { done, already, failed: failed.length });
    revalidatePath("/", "layout");
    const note = [`${done} poster${done === 1 ? "" : "s"} re-framed to 4:5.`, already ? `${already} already 4:5.` : "", failed.length ? `Couldn't do: ${failed.slice(0, 5).join(", ")}${failed.length > 5 ? "…" : ""}.` : ""].filter(Boolean).join(" ");
    await backWith("/events", failed.length ? "error" : "ok", note);
  } catch (error) {
    if (error instanceof Forbidden) await backWith("/events", "error", error.message);
    throw error;
  }
}
