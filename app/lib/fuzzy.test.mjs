import { test } from "node:test";
import assert from "node:assert/strict";
import { fold, fuzzyMatch } from "./fuzzy.mjs";

const row = "Acuaverde as Sponsor Kristine marketing@acuaverderesort.com.ph Dear Acuaverde team Sent No reply yet";

test("fold drops accents, case and punctuation", () => {
  assert.equal(fold("All Kïnd Pet-Naturals!"), "all kind pet naturals");
});

test("empty search matches everything", () => {
  assert.equal(fuzzyMatch("", row), true);
  assert.equal(fuzzyMatch("   ", row), true);
});

test("plain and partial words match", () => {
  assert.equal(fuzzyMatch("acua", row), true);
  assert.equal(fuzzyMatch("kristine sponsor", row), true);
  assert.equal(fuzzyMatch("resort.com", row), true);
});

test("typos still match", () => {
  assert.equal(fuzzyMatch("acuavrde", row), true);
  assert.equal(fuzzyMatch("krsitine", row), true);
  assert.equal(fuzzyMatch("sponser", row), true);
});

test("unrelated words don't match", () => {
  assert.equal(fuzzyMatch("aquaflask", row), false);
  assert.equal(fuzzyMatch("kristine partner", row), false);
  assert.equal(fuzzyMatch("zx", row), false);
});
