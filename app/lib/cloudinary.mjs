/**
 * Cloudinary, where event album photos live (see claude/event-albums-plan in
 * the HOR project). Needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and
 * CLOUDINARY_API_SECRET in Vercel; the secret never leaves the server.
 *
 * Photos are shrunk twice before they are stored, to make the free storage
 * go further: in the browser (longest side 2000 px, WebP), and again by an
 * incoming transformation Cloudinary applies on arrival, in case a browser
 * sent the original. Pages then ask for a copy sized to where it is shown.
 */
import { createHash } from "node:crypto";

/** Longest side a stored photo keeps. Sharp full-screen on a laptop or phone. */
export const MAX_STORED_EDGE = 2000;
/** Applied by Cloudinary to every upload before it is stored. */
export const INCOMING_TRANSFORMATION = `c_limit,w_${MAX_STORED_EDGE},h_${MAX_STORED_EDGE},q_auto:good`;

export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

/** Cloudinary's request signature: sorted params, joined, plus the secret, SHA-1. */
export function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

/** The folder one event's photos go in. */
export function eventFolder(eventId) {
  return `hor/events/${eventId}`;
}

/**
 * A delivery address sized for where it is shown. f_auto picks WebP or AVIF
 * per browser; q_auto picks the lowest quality that still looks right.
 */
export function photoUrl(cloudName, publicId, width = 800) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_limit,w_${width}/${publicId}`;
}

/** Removes one photo from Cloudinary. Resolves either way; returns whether it went. */
export async function destroyPhoto(publicId) {
  const config = cloudinaryConfig();
  if (!config) return false;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ public_id: publicId, timestamp, invalidate: "true" }, config.apiSecret);
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), invalidate: "true", api_key: config.apiKey, signature });
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, { method: "POST", body, signal: AbortSignal.timeout(10000) });
    const json = await response.json().catch(() => ({}));
    return json.result === "ok" || json.result === "not found";
  } catch {
    return false;
  }
}
