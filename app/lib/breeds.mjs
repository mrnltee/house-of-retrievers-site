/**
 * Breeds a registrant can pick for each furbaby (206 with icons, plus "Other"), from HOR's
 * supplied icon set: scripts/breed-icons/import.mjs copies public/dog-breeds-icons/svg into
 * public/breeds/<key>.svg and writes app/lib/breedList.mjs. Listed Aspin, Golden Retriever and
 * Labrador Retriever first (the most common here), then A–Z, then "Other". Keys are what's stored, so change labels freely but keep the keys
 * (the import maps supplied file names onto the original keys, e.g. aspin-asong-pinoy → aspin).
 */
import { BREED_LIST } from "./breedList.mjs";

export const BREEDS = BREED_LIST;

const KEYS = new Set(BREEDS.map((b) => b.key));
const BY_KEY = new Map(BREEDS.map((b) => [b.key, b]));

export const breedLabel = (key) => BY_KEY.get(key)?.label || "";
/** Served by /api/breed-icon/<key>: an icon HOR uploaded, else the built-in public/breeds/<key>.svg. */
export const breedIcon = (key) => (BY_KEY.get(key)?.icon ? `/api/breed-icon/${key}` : null);

/** The breeds sent with an RSVP → one known key (or "") per furbaby, or null when none was chosen. */
export function cleanBreeds(input, furbabies) {
  const list = (Array.isArray(input) ? input : input == null ? [] : [input]).slice(0, Math.max(0, Number(furbabies) || 0));
  const clean = list.map((key) => (KEYS.has(key) ? key : ""));
  return clean.some(Boolean) ? clean : null;
}
