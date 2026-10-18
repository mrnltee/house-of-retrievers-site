/**
 * Optional vaccination-record photos, one per furbaby (registration_vaccination_records,
 * keyed by registration + furbaby_index since migration 045). Private: admins only.
 */

export const MAX_VACCINATION_PHOTOS = 10;
// The whole RSVP must stay under Vercel's 4.5 MB request limit; base64 adds about a third.
const TOTAL_BYTES = 2_800_000;

/** The JPEG size each photo is shrunk to in the browser when `count` are sent together. */
export function vaccinationBudget(count) {
  return Math.min(700_000, Math.floor(TOTAL_BYTES / Math.max(1, count)));
}

/** The RSVP body → [{ index, dataUrl }] for the furbabies that have a photo. `vaccinationRecord` (one photo) is the older form. */
export function vaccinationUploads(body, furbabies) {
  const list = Array.isArray(body?.vaccinationRecords) ? body.vaccinationRecords : body?.vaccinationRecord ? [body.vaccinationRecord] : [];
  return list
    .slice(0, Math.min(MAX_VACCINATION_PHOTOS, Math.max(0, Number(furbabies) || 0)))
    .map((dataUrl, index) => ({ index, dataUrl }))
    .filter((item) => typeof item.dataUrl === "string" && item.dataUrl);
}
