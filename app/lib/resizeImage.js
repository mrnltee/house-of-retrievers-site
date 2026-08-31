/**
 * Shrink a photo in the browser before it is ever uploaded.
 *
 * A phone camera shot is 4–12 MB. Sending that raw would be slow on the
 * mobile connections most people fill this form on, and it would push the
 * request towards the Apps Script payload ceiling for no benefit — nobody
 * needs a 4032px photo to recognise a dog.
 */

/** Longest side after resizing. Comfortably sharp on a retina screen. */
const MAX_EDGE = 1600;

/** JPEG quality. Above ~0.85 the file grows fast for no visible gain. */
const QUALITY = 0.82;

/** Reject before decoding: anything larger is not a photo taken on a phone. */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/**
 * @typedef {Object} ResizedImage
 * @property {string} dataUrl   "data:image/jpeg;base64,..." ready to POST.
 * @property {number} bytes     Size of the encoded JPEG.
 * @property {number} width
 * @property {number} height
 */

/**
 * @param {File} file
 * @returns {Promise<ResizedImage>}
 */
export async function resizeImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("That photo is too large. Try one under 25MB.");
  }

  // from-image applies the EXIF rotation, so photos taken sideways on a phone
  // do not arrive lying down.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new Error("We could not read that photo. Try another one?");

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("We could not read that photo. Try another one?"));
    reader.readAsDataURL(blob);
  });

  return { dataUrl, bytes: blob.size, width, height };
}
