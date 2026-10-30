"use server";

import { revalidatePath } from "next/cache";
import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { posterFor } from "../lib/posterImage";

/**
 * Re-frames every event poster that isn't 4:5 yet, from the kept original
 * (else the current poster), centred where the old crop was. Each can be
 * fine-tuned afterwards in the event's cropper. (The public site already shows
 * un-reframed covers at 4:5 through /api/event-poster; this saves the frame.)
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
        const poster = await posterFor(event);
        if (!poster) { failed.push(event.title); continue; }
        if (!poster.framed) { already += 1; continue; }
        const { area, size, data } = poster;
        const [saved] = await sql("INSERT INTO event_images (mime, data, bytes, created_by) VALUES ('image/jpeg', $1, $2, $3) RETURNING id", [data, data.length, admin.email]);
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
