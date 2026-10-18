"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { BREEDS, breedLabel } from "../lib/breeds.mjs";
import { BREED_ICON_RASTER_SIZE, readBreedIconUpload } from "../lib/breedIcons.mjs";

const KEYS = new Set(BREEDS.filter((b) => b.icon).map((b) => b.key));
const BACK = "/breeds";
const form = (data, key) => (typeof data.get(key) === "string" ? data.get(key) : "");

async function guarded(work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(BACK, "error", error.message);
    throw error;
  }
}

/** Replace a breed's icon with HOR's own (SVG kept as is; PNG/WebP made a 256 px WebP). */
export async function uploadBreedIcon(data) {
  return guarded(async () => {
    const admin = await actionAdmin("events:edit");
    const key = form(data, "key");
    if (!KEYS.has(key)) await backWith(BACK, "error", "That breed isn't in the list.");
    const upload = readBreedIconUpload(form(data, "iconData"));
    if (upload.error) await backWith(BACK, "error", upload.error);
    let { mime, bytes } = upload.value;
    if (mime !== "image/svg+xml") {
      const { default: sharp } = await import("sharp");
      const meta = await sharp(bytes).metadata().catch(() => null);
      if (!meta?.width || meta.width !== meta.height) await backWith(BACK, "error", "The icon must be square, ideally 256 × 256 px.");
      if (meta.width < 128) await backWith(BACK, "error", "That icon is too small. Use at least 128 × 128 px, ideally 256 × 256.");
      bytes = await sharp(bytes).resize(BREED_ICON_RASTER_SIZE, BREED_ICON_RASTER_SIZE).webp({ quality: 90 }).toBuffer();
      mime = "image/webp";
    }
    await sql(
      `INSERT INTO breed_icons (key, mime, data, bytes, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (key) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, bytes = EXCLUDED.bytes, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [key, mime, bytes, bytes.length, admin.email],
    );
    await logActivity(admin.email, "breed.icon", breedLabel(key), { key });
    await backWith(BACK, "ok", `New icon saved for ${breedLabel(key)}. It shows everywhere within about 5 minutes.`);
  });
}

/** Go back to the built-in icon. */
export async function resetBreedIcon(data) {
  return guarded(async () => {
    const admin = await actionAdmin("events:edit");
    const key = form(data, "key");
    if (!KEYS.has(key)) await backWith(BACK, "error", "That breed isn't in the list.");
    await sql("DELETE FROM breed_icons WHERE key = $1", [key]);
    await logActivity(admin.email, "breed.icon", breedLabel(key), { key, reset: true });
    await backWith(BACK, "ok", `${breedLabel(key)} is back to the built-in icon.`);
  });
}
