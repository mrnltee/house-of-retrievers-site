import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { BREEDS, breedLabel, cleanBreeds } from "./breeds.mjs";

test("every listed breed has its icon in public/breeds", () => {
  for (const breed of BREEDS) {
    if (!breed.icon) continue;
    assert.ok(existsSync(new URL(`../../public/breeds/${breed.key}.svg`, import.meta.url)), `${breed.key}.svg`);
  }
  assert.equal(BREEDS.filter((b) => b.icon).length, 16);
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
