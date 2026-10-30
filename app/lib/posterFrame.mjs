/** Posters are 4:5 (owner, 2026-10-27); saved at most 1200 × 1500, like the admin cropper. */
export const POSTER_RATIO = 4 / 5;
export const POSTER_WIDTH = 1200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when a picture of this size is already 4:5 (within 1%). */
export function isPosterSize(width, height) {
  return width > 0 && height > 0 && Math.abs(width / height - POSTER_RATIO) < 0.01;
}

/** The 4:5 window around the old crop's centre (x, y as shares of the picture), as large as fits. */
export function posterWindow(width, height, centre = {}) {
  const w = Math.min(width, Math.round(height * POSTER_RATIO));
  const h = Math.min(height, Math.round(w / POSTER_RATIO));
  const cx = Number.isFinite(centre?.x) ? centre.x * width : width / 2;
  const cy = Number.isFinite(centre?.y) ? centre.y * height : height / 2;
  const left = Math.round(Math.min(width - w, Math.max(0, cx - w / 2)));
  const top = Math.round(Math.min(height - h, Math.max(0, cy - h / 2)));
  return { left, top, width: w, height: h };
}

/** A short fingerprint of what the poster is cut from; it changes whenever the cover, original or framing does. */
export function posterVersion(row) {
  const text = `${row.image || ""}|${row.image_source || ""}|${row.image_crop ? JSON.stringify(row.image_crop) : ""}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return hash.toString(36);
}

/** The public 4:5 poster address for an event row, or "" when it has no cover. */
export function posterPath(row) {
  if (!row?.image || !UUID.test(String(row.id || ""))) return "";
  return `/api/event-poster/${row.id}?v=${posterVersion(row)}`;
}

/**
 * The public event with its cover swapped for the 4:5 poster: on the card, the
 * share image and first on the event page, so every place shows the same frame.
 */
export function withPoster(event, row) {
  const poster = posterPath(row);
  if (!poster) return event;
  const media = event.media?.length ? [{ ...event.media[0], src: poster }, ...event.media.slice(1)] : event.media;
  return { ...event, image: poster, media };
}
