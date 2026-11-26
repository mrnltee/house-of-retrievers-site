import test from "node:test";
import assert from "node:assert/strict";
import { supportsLine } from "./supportsLine.mjs";

test("joins beneficiaries with 'and'", () => {
  assert.equal(
    supportsLine("Pawssion Project Foundation Inc., Little Sisters of the Abandoned Elderly"),
    "Pawssion Project Foundation Inc. and Little Sisters of the Abandoned Elderly",
  );
  assert.equal(supportsLine("A, B, C"), "A, B and C");
});

test("keeps a single name, company suffixes and brackets whole", () => {
  assert.equal(supportsLine("MBY Pet Rescue"), "MBY Pet Rescue");
  assert.equal(supportsLine("The House of Retrievers’ Society, Inc."), "The House of Retrievers’ Society, Inc.");
  assert.equal(supportsLine("Milagros (Quezon City, Metro Manila), MBY"), "Milagros (Quezon City, Metro Manila) and MBY");
  assert.equal(supportsLine(""), "");
  assert.equal(supportsLine(undefined), "");
});
