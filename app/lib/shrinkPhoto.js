"use client";

import { loadBitmap } from "./resizeImage";

/** Longest side kept. Matches the server's incoming limit in app/lib/cloudinary.mjs. */
const MAX_EDGE = 2000;
/** WebP quality. Around 0.8 a photo is a fraction of its JPEG size with no visible loss. */
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.82;

export const mb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * Shrinks a photo before it leaves the device: longest side 2000 px, saved
 * as WebP (JPEG where the browser can't write WebP). Redrawing it also drops
 * the camera's hidden details, location included.
 */
export async function shrinkPhoto(file) {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
  if (!blob || blob.type !== "image/webp") blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("We couldn't read that photo.");
  return blob;
}
