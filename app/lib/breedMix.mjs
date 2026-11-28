/**
 * Mixed breeds (owner, 26 Nov 2026): when a furbaby's breed is "Mixed breed", the
 * registrant picks the parent breeds (up to 3) and the form suggests the mix's name.
 * A known cross gets its usual name (Labrador + Poodle = Labradoodle, `KNOWN_MIXES`);
 * any other pair is blended from short breed names (Golden Retriever + Siberian Husky
 * = Golden Husky, `shortBreedName`). The suggestion is only a starting point: the
 * registrant can type what their family calls the mix.
 *
 * Saved in the same breed slot as any breed (registrations.furbaby_breeds,
 * people.furbaby_breeds), so no migration: "mix:<key>+<key>:<name>", e.g.
 * "mix:golden-retriever+siberian-husky:Golden Husky". "mixed" alone means Mixed
 * breed with no parents given. breedLabel / breedIcon in breeds.mjs read both.
 */
import { BREED_LIST } from "./breedList.mjs";

export const MIXED_KEY = "mixed";
export const MAX_MIX_PARENTS = 3;
export const MIX_NAME_MAX = 40;

const LABELS = new Map(BREED_LIST.map((b) => [b.key, b.label]));
/** Breeds that can be a parent: every listed breed except "Other / not sure". */
export const PARENT_BREEDS = BREED_LIST.filter((b) => b.key !== "other" && b.key !== MIXED_KEY);
const PARENT_KEYS = new Set(PARENT_BREEDS.map((b) => b.key));

// Sizes of one breed share their crosses' names: a Toy Poodle cross is still a "-doodle".
const FAMILY = {
  poodle: "poodle", "miniature-poodle": "poodle", "toy-poodle": "poodle",
  corgi: "corgi", "cardigan-welsh-corgi": "corgi",
  "cocker-spaniel": "cocker", "american-cocker-spaniel": "cocker",
  "miniature-schnauzer": "schnauzer", "standard-schnauzer": "schnauzer", "giant-schnauzer": "schnauzer",
  akita: "akita", "american-akita": "akita",
};
const family = (key) => FAMILY[key] || key;

/**
 * Crosses with an established name, by parent family. The first name is suggested;
 * the rest are offered as "Also called". Golden + Husky leads with Golden Husky, the
 * owner's own example; Goberian is the other name it goes by.
 */
const KNOWN = [
  ["labrador-retriever", "poodle", "Labradoodle"],
  ["golden-retriever", "poodle", "Goldendoodle", "Groodle"],
  ["golden-retriever", "labrador-retriever", "Goldador", "Golden Lab"],
  ["golden-retriever", "siberian-husky", "Golden Husky", "Goberian"],
  ["golden-retriever", "german-shepherd", "Golden Shepherd"],
  ["golden-retriever", "cocker", "Golden Cocker Retriever"],
  ["golden-retriever", "pit-bull", "Golden Pit"],
  ["golden-retriever", "bernese-mountain-dog", "Golden Mountain Dog"],
  ["golden-retriever", "great-pyrenees", "Golden Pyrenees"],
  ["labrador-retriever", "siberian-husky", "Labsky", "Huskador"],
  ["labrador-retriever", "german-shepherd", "Labrashepherd", "Sheprador"],
  ["labrador-retriever", "beagle", "Beagador"],
  ["labrador-retriever", "border-collie", "Borador"],
  ["labrador-retriever", "pit-bull", "Pitador", "Labrabull"],
  ["labrador-retriever", "rottweiler", "Labrottie"],
  ["labrador-retriever", "boxer", "Boxador"],
  ["labrador-retriever", "dachshund", "Doxador"],
  ["labrador-retriever", "corgi", "Corgidor"],
  ["labrador-retriever", "great-dane", "Labradane"],
  ["labrador-retriever", "chinese-shar-pei", "Lab Pei"],
  ["labrador-retriever", "bernese-mountain-dog", "Labernese"],
  ["poodle", "maltese", "Maltipoo"],
  ["poodle", "yorkshire-terrier", "Yorkipoo"],
  ["poodle", "shih-tzu", "Shih-poo"],
  ["poodle", "cocker", "Cockapoo"],
  ["poodle", "cavalier-king-charles-spaniel", "Cavapoo"],
  ["poodle", "bichon-frise", "Poochon"],
  ["poodle", "pomeranian", "Pomapoo"],
  ["poodle", "pug", "Pugapoo"],
  ["poodle", "schnauzer", "Schnoodle"],
  ["poodle", "bernese-mountain-dog", "Bernedoodle"],
  ["poodle", "saint-bernard", "Saint Berdoodle"],
  ["poodle", "newfoundland", "Newfypoo"],
  ["poodle", "australian-shepherd", "Aussiedoodle"],
  ["poodle", "border-collie", "Bordoodle"],
  ["poodle", "siberian-husky", "Huskydoodle", "Siberpoo"],
  ["poodle", "german-shepherd", "Shepadoodle"],
  ["poodle", "great-dane", "Great Danoodle"],
  ["poodle", "dalmatian", "Dalmadoodle"],
  ["poodle", "corgi", "Corgipoo"],
  ["poodle", "chihuahua", "Chipoo"],
  ["poodle", "beagle", "Poogle"],
  ["poodle", "dachshund", "Doxiepoo"],
  ["poodle", "havanese", "Havapoo"],
  ["poodle", "jack-russell-terrier", "Jackapoo"],
  ["poodle", "lhasa-apso", "Lhasapoo"],
  ["poodle", "west-highland-white-terrier", "Westiepoo"],
  ["poodle", "english-springer-spaniel", "Springerdoodle"],
  ["poodle", "airedale-terrier", "Airedoodle"],
  ["siberian-husky", "pomeranian", "Pomsky"],
  ["siberian-husky", "german-shepherd", "Gerberian Shepsky"],
  ["siberian-husky", "corgi", "Horgi"],
  ["siberian-husky", "alaskan-malamute", "Alusky"],
  ["siberian-husky", "border-collie", "Border Husky"],
  ["siberian-husky", "pit-bull", "Pitsky"],
  ["beagle", "pug", "Puggle"],
  ["beagle", "dachshund", "Doxle"],
  ["beagle", "jack-russell-terrier", "Jackabee"],
  ["beagle", "cocker", "Bocker"],
  ["beagle", "chinese-shar-pei", "Sharp Eagle"],
  ["beagle", "chihuahua", "Cheagle"],
  ["beagle", "corgi", "Beagi"],
  ["chihuahua", "dachshund", "Chiweenie"],
  ["chihuahua", "yorkshire-terrier", "Chorkie"],
  ["chihuahua", "pomeranian", "Pomchi"],
  ["chihuahua", "pug", "Chug"],
  ["chihuahua", "maltese", "Malchi"],
  ["chihuahua", "shih-tzu", "Shichi"],
  ["chihuahua", "jack-russell-terrier", "Jack Chi"],
  ["chihuahua", "pekingese", "Cheeks"],
  ["chihuahua", "corgi", "Chigi"],
  ["chihuahua", "miniature-pinscher", "Chipin"],
  ["shih-tzu", "maltese", "Malshi"],
  ["shih-tzu", "pomeranian", "Shiranian"],
  ["shih-tzu", "yorkshire-terrier", "Shorkie"],
  ["shih-tzu", "pug", "Pug-Zu"],
  ["shih-tzu", "bichon-frise", "Shichon", "Zuchon"],
  ["shih-tzu", "cavalier-king-charles-spaniel", "Cava-Tzu"],
  ["shih-tzu", "lhasa-apso", "Lhasa Tzu"],
  ["shih-tzu", "pekingese", "Shih-Nese"],
  ["shih-tzu", "dachshund", "Schweenie"],
  ["maltese", "yorkshire-terrier", "Morkie"],
  ["maltese", "pomeranian", "Maltipom"],
  ["maltese", "bichon-frise", "Maltichon"],
  ["pug", "french-bulldog", "Frug"],
  ["pug", "dachshund", "Daug"],
  ["pug", "pomeranian", "Pom-A-Pug"],
  ["pug", "jack-russell-terrier", "Jug"],
  ["pug", "boston-terrier", "Bugg"],
  ["pug", "corgi", "Porgi"],
  ["yorkshire-terrier", "dachshund", "Dorkie"],
  ["yorkshire-terrier", "pomeranian", "Yoranian"],
  ["corgi", "dachshund", "Dorgi"],
  ["corgi", "german-shepherd", "Corman Shepherd"],
  ["corgi", "australian-shepherd", "Auggie"],
  ["corgi", "pomeranian", "Corgipom"],
  ["corgi", "shiba-inu", "Corgi Inu"],
  ["cavalier-king-charles-spaniel", "bichon-frise", "Cavachon"],
  ["german-shepherd", "rottweiler", "Shepweiler"],
  ["german-shepherd", "border-collie", "Shollie"],
  ["boxer", "pit-bull", "Bullboxer Pit"],
  ["french-bulldog", "boston-terrier", "Frenchton"],
  ["dachshund", "jack-russell-terrier", "Jackshund"],
  ["dachshund", "pomeranian", "Dameranian"],
].map(([a, b, ...names]) => [a, b, names]);

const pairKey = (a, b) => [family(a), family(b)].sort().join("|");
export const KNOWN_MIXES = new Map(KNOWN.map(([a, b, names]) => [pairKey(a, b), names]));

/** Short names that read better in a blend than the rule below would give. */
const SHORT = {
  aspin: "Aspin", "golden-retriever": "Golden", "labrador-retriever": "Lab", "australian-shepherd": "Aussie",
  "yorkshire-terrier": "Yorkie", "shih-tzu": "Shih Tzu", "bernese-mountain-dog": "Bernese",
  "greater-swiss-mountain-dog": "Swissy", "entlebucher-mountain-dog": "Entlebucher", "pit-bull": "Pit",
  "english-bulldog": "Bulldog", "french-bulldog": "Frenchie", "american-bulldog": "Bulldog",
  "cavalier-king-charles-spaniel": "Cavalier", "west-highland-white-terrier": "Westie",
  "staffordshire-bull-terrier": "Staffy", "american-staffordshire-terrier": "AmStaff",
  "chinese-shar-pei": "Shar-Pei", "doberman-pinscher": "Doberman", "saint-bernard": "Saint Bernard",
  "great-pyrenees": "Pyrenees", "old-english-sheepdog": "Sheepdog", "nova-scotia-duck-tolling-retriever": "Toller",
  "chesapeake-bay-retriever": "Chessie", "flat-coated-retriever": "Flat-Coat", "curly-coated-retriever": "Curly",
  "bichon-frise": "Bichon", "lhasa-apso": "Lhasa", "italian-greyhound": "Iggy", "miniature-pinscher": "Min Pin",
  "chow-chow": "Chow", "shetland-sheepdog": "Sheltie", "rhodesian-ridgeback": "Ridgeback", "thai-ridgeback": "Ridgeback",
  "coton-de-tulear": "Coton", "brussels-griffon": "Griffon", "english-springer-spaniel": "Springer",
  "welsh-springer-spaniel": "Springer", "german-shorthaired-pointer": "Pointer", "german-wirehaired-pointer": "Pointer",
  "jack-russell-terrier": "Jack Russell", "parson-russell-terrier": "Russell", "border-collie": "Collie",
  "bearded-collie": "Beardie", "alaskan-malamute": "Malamute", "american-eskimo-dog": "Eskie",
  "dogo-argentino": "Dogo", "cane-corso": "Corso", "xoloitzcuintli": "Xolo", "peruvian-inca-orchid": "Inca",
  "american-akita": "Akita", "japanese-spitz": "Spitz", "german-spitz": "Spitz", "finnish-spitz": "Spitz",
  "kangal-shepherd-dog": "Kangal", "neapolitan-mastiff": "Mastiff", "english-mastiff": "Mastiff",
  "tibetan-mastiff": "Mastiff", "black-russian-terrier": "Russian Terrier", "toy-fox-terrier": "Fox Terrier",
  "great-dane": "Dane", "irish-wolfhound": "Wolfhound", "scottish-deerhound": "Deerhound",
};
// A breed's last word, when it only says what kind of dog it is, doesn't tell breeds apart.
const GENERIC = new Set(["Retriever", "Terrier", "Spaniel", "Dog", "Hound", "Inu", "Ken", "Sheepdog", "Setter", "Pointer", "Coonhound", "Mastiff", "Spitz", "Herder", "Farmdog", "Toy"]);

/** "Siberian Husky" → "Husky", "Shiba Inu" → "Shiba", "Golden Retriever" → "Golden". */
export function shortBreedName(key) {
  if (SHORT[key]) return SHORT[key];
  const label = (LABELS.get(key) || "").split("/")[0].trim();
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return label;
  const last = words[words.length - 1];
  return GENERIC.has(last) ? words.slice(0, -1).join(" ") : last;
}

/** Parent keys as given → known, unique, at most 3, in the order picked. */
export function cleanParents(input) {
  const list = Array.isArray(input) ? input : [];
  return [...new Set(list.filter((k) => PARENT_KEYS.has(k)))].slice(0, MAX_MIX_PARENTS);
}

/**
 * What to call a mix of these parents: { name, known, others }. `known` is true for an
 * established name; `others` are its other names. No parents gives no name.
 */
export function suggestMixName(parents) {
  const list = cleanParents(parents);
  if (!list.length) return { name: "", known: false, others: [] };
  if (list.length === 1) return { name: `${LABELS.get(list[0])} mix`, known: false, others: [] };
  if (list.length === 2) {
    const names = KNOWN_MIXES.get(pairKey(list[0], list[1]));
    if (names) return { name: names[0], known: true, others: names.slice(1) };
    const [a, b] = list.map(shortBreedName);
    if (a === b) return { name: `${a} mix`, known: false, others: [] };
    return { name: `${a} ${b}`, known: false, others: [] };
  }
  const shorts = [...new Set(list.map(shortBreedName))];
  return { name: `${shorts.slice(0, -1).join(", ")} and ${shorts[shorts.length - 1]} mix`, known: false, others: [] };
}

/** A typed mix name, tidied: no control characters or ":", single spaces, 40 characters. */
export function cleanMixName(value) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f:]/g, " ").replace(/\s+/g, " ").trim().slice(0, MIX_NAME_MAX).trim();
}

export const isMixValue = (value) => value === MIXED_KEY || (typeof value === "string" && value.startsWith("mix:"));

/** "mix:a+b:Name" → { parents, name } (name falls back to the suggestion); "mixed" → no parents. */
export function parseMix(value) {
  if (value === MIXED_KEY) return { parents: [], name: "" };
  const match = typeof value === "string" ? /^mix:([a-z0-9+-]*)(?::([\s\S]*))?$/.exec(value) : null;
  if (!match) return null;
  const parents = cleanParents(match[1].split("+"));
  const name = cleanMixName(match[2]) || suggestMixName(parents).name;
  return { parents, name };
}

/** Parents + name → the saved value. No parents is plain "mixed"; a blank name takes the suggestion. */
export function encodeMix(parents, name) {
  const list = cleanParents(parents);
  if (!list.length) return MIXED_KEY;
  return `mix:${list.join("+")}:${cleanMixName(name) || suggestMixName(list).name}`;
}

/** A value from a form → a clean mix value, or "" when it isn't one. */
export function cleanMix(value) {
  const mix = isMixValue(value) ? parseMix(value) : null;
  return mix ? encodeMix(mix.parents, mix.name) : "";
}

/** "Golden Retriever × Siberian Husky", for tooltips, the CSV and the Join sheet. */
export function mixParentsLabel(value) {
  const mix = isMixValue(value) ? parseMix(value) : null;
  return mix ? mix.parents.map((k) => LABELS.get(k)).join(" × ") : "";
}
