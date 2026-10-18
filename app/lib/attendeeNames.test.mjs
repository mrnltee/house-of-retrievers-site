import test from "node:test";
import assert from "node:assert/strict";
import { cleanGuestNames, joinFurbabyNames } from "./attendeeNames.mjs";

test("cleanGuestNames: the other hoomans' names, trimmed, one per extra person", () => {
  assert.deepEqual(cleanGuestNames(["  Ben   Cruz ", "", "Cara"], 3), ["Ben Cruz", ""]);
  assert.equal(cleanGuestNames(["", ""], 3), null);
  assert.equal(cleanGuestNames(["Ben"], 1), null);
  assert.equal(cleanGuestNames("nope", 2), null);
  assert.equal(cleanGuestNames(["x".repeat(200)], 2)[0].length, 120);
});

test("joinFurbabyNames: per-furbaby names become the one furbaby line", () => {
  assert.equal(joinFurbabyNames(["Mochi", " Fudge ", ""], 3), "Mochi, Fudge");
  assert.equal(joinFurbabyNames(["Mochi", "Fudge"], 1), "Mochi");
  assert.equal(joinFurbabyNames([], 2), "");
});
