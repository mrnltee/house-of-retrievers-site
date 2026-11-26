/**
 * Breeds a registrant can pick for each furbaby (206 with icons, plus "Other"), from HOR's
 * supplied icon set: scripts/breed-icons/import.mjs copies public/dog-breeds-icons/svg into
 * public/breeds/<key>.svg and writes app/lib/breedList.mjs. Listed Aspin, Golden Retriever and
 * Labrador Retriever first (the most common here), then A–Z, then "Other". Keys are what's stored, so change labels freely but keep the keys
 * (the import maps supplied file names onto the original keys, e.g. aspin-asong-pinoy → aspin).
 */
import { BREED_LIST } from "./breedList.mjs";
import { MIXED_KEY, cleanMix, isMixValue, mixParentsLabel, parseMix } from "./breedMix.mjs";

// "Mixed breed" (owner, 26 Nov 2026) sits right after the three most common breeds; picking
// it asks for the parent breeds and names the mix (breedMix.mjs). It has no icon of its own.
export const BREEDS = [...BREED_LIST.slice(0, 3), { key: MIXED_KEY, label: "Mixed breed", icon: false }, ...BREED_LIST.slice(3)];

const KEYS = new Set(BREEDS.map((b) => b.key));
const BY_KEY = new Map(BREEDS.map((b) => [b.key, b]));

/** A breed key's label; a mix's own name ("Golden Husky"), or "Mixed breed" when no parents were given. */
export function breedLabel(key) {
  if (isMixValue(key)) return parseMix(key)?.name || BY_KEY.get(MIXED_KEY).label;
  return BY_KEY.get(key)?.label || "";
}
/** The label with a mix's parents: "Golden Husky (Golden Retriever × Siberian Husky)". For tooltips, CSV and the Join sheet. */
export function breedFullLabel(key) {
  const parents = mixParentsLabel(key);
  return parents ? `${breedLabel(key)} (${parents})` : breedLabel(key);
}
/** Served by /api/breed-icon/<key>: an icon HOR uploaded, else the built-in public/breeds/<key>.svg. A mix shows its first parent's icon. */
export function breedIcon(key) {
  const own = isMixValue(key) ? parseMix(key)?.parents[0] : key;
  return BY_KEY.get(own)?.icon ? `/api/breed-icon/${own}` : null;
}

/** The breeds sent with an RSVP → one known key (or "") per furbaby, or null when none was chosen. */
export function cleanBreeds(input, furbabies) {
  const list = (Array.isArray(input) ? input : input == null ? [] : [input]).slice(0, Math.max(0, Number(furbabies) || 0));
  const clean = list.map((key) => (isMixValue(key) ? cleanMix(key) : KEYS.has(key) ? key : ""));
  return clean.some(Boolean) ? clean : null;
}
