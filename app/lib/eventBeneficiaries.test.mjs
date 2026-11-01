import { test } from "node:test";
import assert from "node:assert/strict";
import { pickedIds, supportsLine } from "./eventBeneficiaries.mjs";

test("the event's 'For' line is built from the picked beneficiaries", () => {
  assert.equal(supportsLine([]), "");
  assert.equal(supportsLine(["Pawssion Project"]), "Pawssion Project");
  assert.equal(supportsLine(["Pawssion Project", "Little Sisters"]), "Pawssion Project and Little Sisters");
  assert.equal(supportsLine(["A", "B", "C"]), "A, B and C");
});

test("only beneficiaries from the list can be picked, once each", () => {
  const ids = ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"];
  assert.deepEqual(pickedIds([ids[0], ids[0], "x", ids[1], "33333333-3333-3333-3333-333333333333"], ids), ids);
  assert.deepEqual(pickedIds([], ids), []);
});
