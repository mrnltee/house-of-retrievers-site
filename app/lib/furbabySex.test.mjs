import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSexes, sexLabel, FURBABY_SEXES } from "./furbabySex.mjs";

test("one value per furbaby, by position; anything else is left blank", () => {
  assert.deepEqual(cleanSexes(["male", "female", "x", ""], 4), ["male", "female", "", ""]);
  assert.deepEqual(cleanSexes(["MALE", " female "], 2), ["male", "female"]);
});

test("cut to the number of furbabies; null when none is chosen", () => {
  assert.deepEqual(cleanSexes(["male", "female", "male"], 2), ["male", "female"]);
  assert.equal(cleanSexes(["", ""], 2), null);
  assert.equal(cleanSexes(["male"], 0), null);
  assert.equal(cleanSexes(undefined, 2), null);
  assert.deepEqual(cleanSexes("female", 1), ["female"]);
});

test("labels", () => {
  assert.deepEqual(FURBABY_SEXES, ["male", "female"]);
  assert.equal(sexLabel("male"), "Male");
  assert.equal(sexLabel("female"), "Female");
  assert.equal(sexLabel(""), "");
});
