import test from "node:test";
import assert from "node:assert/strict";
import { KNOWN_MIXES, PARENT_BREEDS, cleanMix, cleanMixName, encodeMix, isMixValue, mixParentsLabel, parseMix, shortBreedName, suggestMixName } from "./breedMix.mjs";
import { BREEDS, breedFullLabel, breedIcon, breedLabel, cleanBreeds } from "./breeds.mjs";

test("known crosses get their usual name, whichever parent comes first", () => {
  assert.equal(suggestMixName(["labrador-retriever", "poodle"]).name, "Labradoodle");
  assert.equal(suggestMixName(["poodle", "labrador-retriever"]).name, "Labradoodle");
  assert.equal(suggestMixName(["toy-poodle", "labrador-retriever"]).name, "Labradoodle");
  assert.equal(suggestMixName(["chihuahua", "yorkshire-terrier"]).name, "Chorkie");
  assert.equal(suggestMixName(["chihuahua", "dachshund"]).name, "Chiweenie");
  assert.equal(suggestMixName(["golden-retriever", "labrador-retriever"]).name, "Goldador");
  assert.equal(suggestMixName(["cardigan-welsh-corgi", "siberian-husky"]).name, "Horgi");
  const husky = suggestMixName(["golden-retriever", "siberian-husky"]);
  assert.deepEqual(husky, { name: "Golden Husky", known: true, others: ["Goberian"] });
});

test("every known cross names real parents", () => {
  const families = new Set([...PARENT_BREEDS.map((b) => b.key), "cocker", "schnauzer"]);
  for (const key of KNOWN_MIXES.keys()) for (const part of key.split("|")) assert.ok(families.has(part), part);
});

test("any other pair is blended from short names", () => {
  assert.equal(shortBreedName("siberian-husky"), "Husky");
  assert.equal(shortBreedName("shiba-inu"), "Shiba");
  assert.equal(shortBreedName("boston-terrier"), "Boston");
  assert.equal(shortBreedName("beagle"), "Beagle");
  assert.equal(shortBreedName("aspin"), "Aspin");
  assert.deepEqual(suggestMixName(["golden-retriever", "shiba-inu"]), { name: "Golden Shiba", known: false, others: [] });
  assert.equal(suggestMixName(["aspin", "beagle"]).name, "Aspin Beagle");
  assert.equal(suggestMixName(["toy-poodle", "miniature-poodle"]).name, "Poodle mix");
  assert.equal(suggestMixName(["golden-retriever"]).name, "Golden Retriever mix");
  assert.equal(suggestMixName(["golden-retriever", "siberian-husky", "poodle"]).name, "Golden, Husky and Poodle mix");
  assert.equal(suggestMixName([]).name, "");
});

test("parents: known, no repeats, at most three, never Mixed or Other", () => {
  assert.deepEqual(parseMix("mix:beagle+beagle+nope+other+mixed+pug:x").parents, ["beagle", "pug"]);
  assert.equal(parseMix("mix:a+b+c+d").parents.length, 0);
  assert.equal(encodeMix(["pug", "beagle", "corgi", "poodle"], "").split(":")[1], "pug+beagle+corgi");
});

test("a mix is saved as one breed value and read back", () => {
  const value = encodeMix(["golden-retriever", "siberian-husky"], "");
  assert.equal(value, "mix:golden-retriever+siberian-husky:Golden Husky");
  assert.deepEqual(parseMix(value), { parents: ["golden-retriever", "siberian-husky"], name: "Golden Husky" });
  assert.equal(encodeMix(["labrador-retriever", "poodle"], "  Our  Doodle "), "mix:labrador-retriever+poodle:Our Doodle");
  assert.equal(encodeMix([], "Anything"), "mixed");
  assert.equal(parseMix("mix:pug+beagle").name, "Puggle");
  assert.equal(parseMix("golden-retriever"), null);
  assert.ok(isMixValue("mixed") && isMixValue("mix:pug") && !isMixValue("pug"));
});

test("typed names are tidied", () => {
  assert.equal(cleanMixName("a:b\nc"), "a b c");
  assert.equal(cleanMixName("x".repeat(60)).length, 40);
  assert.equal(cleanMix("mix:pug+beagle:  "), "mix:pug+beagle:Puggle");
  assert.equal(cleanMix("pug"), "");
});

test("breed helpers read mixes: name, parents, first parent's icon", () => {
  assert.ok(BREEDS.some((b) => b.key === "mixed" && !b.icon));
  const value = "mix:labrador-retriever+poodle:Labradoodle";
  assert.equal(breedLabel(value), "Labradoodle");
  assert.equal(breedLabel("mixed"), "Mixed breed");
  assert.equal(breedFullLabel(value), "Labradoodle (Labrador Retriever × Standard Poodle)");
  assert.equal(breedFullLabel("beagle"), "Beagle");
  assert.equal(mixParentsLabel("beagle"), "");
  assert.equal(breedIcon(value), "/api/breed-icon/labrador-retriever");
  assert.equal(breedIcon("mixed"), null);
  assert.deepEqual(cleanBreeds([value, "mixed", "mix:nope", "beagle"], 4), [value, "mixed", "mixed", "beagle"]);
});
