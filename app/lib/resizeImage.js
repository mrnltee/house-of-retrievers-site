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
 * Decode a picked file with the EXIF rotation applied, so photos taken
 * sideways on a phone do not arrive lying down.
 * @param {Blob} file
 * @returns {Promise<ImageBitmap>}
 */
export async function loadBitmap(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("That photo is too large. Try one under 25MB.");
  }
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("We could not read that photo. Try another one?");
  }
}

/**
 * Encode a canvas as a JPEG data URL.
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{dataUrl: string, bytes: number}>}
 */
export async function encodeJpeg(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new Error("We could not read that photo. Try another one?");
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("We could not read that photo. Try another one?"));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, bytes: blob.size };
}

/**
 * @param {File} file
 * @returns {Promise<ResizedImage>}
 */
export async function resizeImage(file) {
  const bitmap = await loadBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const { dataUrl, bytes } = await encodeJpeg(canvas);
  return { dataUrl, bytes, width, height };
}

/**
 * Encode a canvas as a JPEG no larger than `maxBytes`: first by lowering the
 * quality, then by shrinking the picture. Detailed phone photos (grass,
 * water, fur) can be several times larger than plain ones at the same size,
 * and the admin's save has a hard request ceiling.
 * @param {HTMLCanvasElement} canvas
 * @param {number} maxBytes
 * @returns {Promise<{dataUrl: string, bytes: number, width: number, height: number}>}
 */
export async function encodeJpegWithin(canvas, maxBytes) {
  let source = canvas;
  for (let round = 0; round < 4; round += 1) {
    for (const quality of [QUALITY, 0.74, 0.66]) {
      const blob = await new Promise((resolve) => source.toBlob(resolve, "image/jpeg", quality));
      if (!blob) throw new Error("We could not read that photo. Try another one?");
      if (blob.size <= maxBytes || (round === 3 && quality === 0.66)) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("We could not read that photo. Try another one?"));
          reader.readAsDataURL(blob);
        });
        return { dataUrl, bytes: blob.size, width: source.width, height: source.height };
      }
    }
    const smaller = document.createElement("canvas");
    smaller.width = Math.round(source.width * 0.8);
    smaller.height = Math.round(source.height * 0.8);
    const context = smaller.getContext("2d");
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, smaller.width, smaller.height);
    source = smaller;
  }
  throw new Error("We could not make that photo small enough. Try another one?");
}
