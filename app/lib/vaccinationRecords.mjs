/**
 * Optional vaccination-record photos, one per furbaby (registration_vaccination_records,
 * keyed by registration + furbaby_index since migration 045). Private: admins only.
 */

export const MAX_VACCINATION_PHOTOS = 10; // furbabies with a record
/** Photos per furbaby (e.g. several pages of a vaccination booklet). */
export const MAX_IMAGES_PER_FURBABY = 5;
/** Photos in one RSVP, all furbabies together, so the request stays under the size limit. */
export const MAX_IMAGES_PER_RSVP = 20;
// The whole RSVP must stay under Vercel's 4.5 MB request limit; base64 adds about a third.
const TOTAL_BYTES = 2_800_000;

/** The JPEG size each photo is shrunk to in the browser when `count` are sent together. */
export function vaccinationBudget(count) {
  return Math.min(700_000, Math.floor(TOTAL_BYTES / Math.max(1, count)));
}

/**
 * The RSVP body → [{ index, page, dataUrl }] for the furbabies that have photos.
 * `vaccinationRecords[i]` is one data URL (older form) or an array of up to
 * MAX_IMAGES_PER_FURBABY; `vaccinationRecord` (one photo) is the oldest form.
 */
export function vaccinationUploads(body, furbabies) {
  const list = Array.isArray(body?.vaccinationRecords) ? body.vaccinationRecords : body?.vaccinationRecord ? [body.vaccinationRecord] : [];
  const out = [];
  list.slice(0, Math.min(MAX_VACCINATION_PHOTOS, Math.max(0, Number(furbabies) || 0))).forEach((entry, index) => {
    const photos = Array.isArray(entry) ? entry : [entry];
    photos
      .filter((dataUrl) => typeof dataUrl === "string" && dataUrl)
      .slice(0, MAX_IMAGES_PER_FURBABY)
      .forEach((dataUrl, page) => out.push({ index, page, dataUrl }));
  });
  return out.slice(0, MAX_IMAGES_PER_RSVP);
}

/** Furbaby positions (0-based) without a card, when the event requires one for each furbaby. */
export function missingVaccinationCards(uploads, furbabies) {
  const have = new Set((uploads || []).map((u) => u.index));
  return Array.from({ length: Math.min(MAX_VACCINATION_PHOTOS, Math.max(0, Number(furbabies) || 0)) }, (_, i) => i).filter((i) => !have.has(i));
}

/**
 * The first `count` unused photo slots (page numbers) for a furbaby, given the
 * pages already on file, or null when they don't all fit. Lets an admin add
 * several photos in one save.
 */
export function freeVaccinationPages(used, count) {
  const taken = new Set(used);
  const free = Array.from({ length: MAX_IMAGES_PER_FURBABY }, (_, i) => i).filter((i) => !taken.has(i));
  return count >= 1 && count <= free.length ? free.slice(0, count) : null;
}
