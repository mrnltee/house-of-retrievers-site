import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { BREEDS, breedLabel, cleanBreeds } from "./breeds.mjs";

test("every listed breed has its icon in public/breeds", () => {
  for (const breed of BREEDS) {
    if (!breed.icon) continue;
    assert.ok(existsSync(new URL(`../../public/breeds/${breed.key}.svg`, import.meta.url)), `${breed.key}.svg`);
  }
  assert.equal(BREEDS.filter((b) => b.icon).length, 206);
  // The first set's keys are saved on registrations and people: they must all still exist.
  for (const key of ["aspin", "akita", "american-bully", "beagle", "belgian-malinois", "bichon-frise", "borzoi", "chihuahua", "chow-chow", "cocker-spaniel", "corgi", "dachshund", "dalmatian", "french-bulldog", "german-shepherd", "golden-retriever", "jack-russell-terrier", "labrador-retriever", "lhasa-apso", "maltese", "pit-bull", "pomeranian", "poodle", "samoyed", "shiba-inu", "shih-tzu", "siberian-husky", "toy-poodle", "yorkshire-terrier"]) {
    assert.ok(BREEDS.some((b) => b.key === key), key);
  }
  assert.deepEqual(BREEDS.slice(0, 3).map((b) => b.key), ["aspin", "golden-retriever", "labrador-retriever"]);
  const rest = BREEDS.slice(3, -1).map((b) => b.label);
  assert.deepEqual(rest, [...rest].sort((a, b) => a.localeCompare(b, "en")));
  assert.equal(new Set(BREEDS.map((b) => b.key)).size, BREEDS.length);
  assert.equal(BREEDS[BREEDS.length - 1].key, "other");
  assert.ok(BREEDS.some((b) => b.key === "other" && !b.icon));
});

test("breeds from the form are cleaned: known keys only, one per furbaby", () => {
  assert.deepEqual(cleanBreeds(["golden-retriever", "aspin"], 2), ["golden-retriever", "aspin"]);
  assert.deepEqual(cleanBreeds(["golden-retriever", "aspin", "beagle"], 2), ["golden-retriever", "aspin"]);
  assert.deepEqual(cleanBreeds(["not-a-breed", "beagle"], 2), ["", "beagle"]);
  assert.deepEqual(cleanBreeds("corgi", 1), ["corgi"]);
});

test("no breed chosen saves nothing", () => {
  assert.equal(cleanBreeds([], 2), null);
  assert.equal(cleanBreeds(["", ""], 2), null);
  assert.equal(cleanBreeds(["beagle"], 0), null);
  assert.equal(cleanBreeds(undefined, 1), null);
});

test("labels read the way people say them", () => {
  assert.equal(breedLabel("aspin"), "Aspin / Asong Pinoy");
  assert.equal(breedLabel("other"), "Other / not sure");
  assert.equal(breedLabel("nope"), "");
});
