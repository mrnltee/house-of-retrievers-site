/**
 * Breeds a registrant can pick for each furbaby. Icons live in
 * public/breeds/<key>.svg (built by scripts/breed-icons/build.mjs). Keys are
 * what's stored, so change labels freely but keep the keys.
 */

export const BREEDS = [
  { key: "aspin", label: "Aspin / Asong Pinoy", icon: true },
  { key: "shih-tzu", label: "Shih Tzu", icon: true },
  { key: "chihuahua", label: "Chihuahua", icon: true },
  { key: "pomeranian", label: "Pomeranian", icon: true },
  { key: "poodle", label: "Poodle", icon: true },
  { key: "toy-poodle", label: "Toy Poodle", icon: true },
  { key: "golden-retriever", label: "Golden Retriever", icon: true },
  { key: "labrador-retriever", label: "Labrador Retriever", icon: true },
  { key: "siberian-husky", label: "Siberian Husky", icon: true },
  { key: "german-shepherd", label: "German Shepherd", icon: true },
  { key: "beagle", label: "Beagle", icon: true },
  { key: "dachshund", label: "Dachshund", icon: true },
  { key: "french-bulldog", label: "French Bulldog", icon: true },
  { key: "corgi", label: "Corgi", icon: true },
  { key: "american-bully", label: "American Bully", icon: true },
  { key: "pit-bull", label: "Pit Bull–type dog", icon: true },
  { key: "other", label: "Other / not sure", icon: false },
];

const KEYS = new Set(BREEDS.map((b) => b.key));
const BY_KEY = new Map(BREEDS.map((b) => [b.key, b]));

export const breedLabel = (key) => BY_KEY.get(key)?.label || "";
export const breedIcon = (key) => (BY_KEY.get(key)?.icon ? `/breeds/${key}.svg` : null);

/** The breeds sent with an RSVP → one known key (or "") per furbaby, or null when none was chosen. */
export function cleanBreeds(input, furbabies) {
  const list = (Array.isArray(input) ? input : input == null ? [] : [input]).slice(0, Math.max(0, Number(furbabies) || 0));
  const clean = list.map((key) => (KEYS.has(key) ? key : ""));
  return clean.some(Boolean) ? clean : null;
}
