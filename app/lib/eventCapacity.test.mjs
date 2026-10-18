import test from "node:test";
import assert from "node:assert/strict";
import { capacityUnitLabel, capacityUnits, cleanCapacityBasis, validateCapacityCounts } from "./eventCapacity.mjs";

test("capacity defaults to one slot per registration", () => {
  assert.equal(cleanCapacityBasis("unknown"), "registration");
  assert.equal(capacityUnits("registration", { humans: 3, furbabies: 2 }), 1);
  assert.equal(capacityUnitLabel("registration"), "registrations");
});

test("capacity can count hoomans or furbabies instead of RSVP rows", () => {
  assert.equal(capacityUnits("human", { humans: 3, furbabies: 1 }), 3);
  assert.equal(capacityUnits("furbaby", { humans: 3, furbabies: 2 }), 2);
  assert.equal(capacityUnitLabel("human"), "hoomans");
  assert.equal(capacityUnitLabel("furbaby", false), "furbaby");
});

test("a furbaby-capacity event requires a furbaby in each registration", () => {
  assert.match(validateCapacityCounts("furbaby", 1, 0).error, /at least one furbaby/);
  assert.deepEqual(validateCapacityCounts("furbaby", 3, 2), { units: 2 });
  assert.deepEqual(validateCapacityCounts("human", 3, 0), { units: 3 });
});

test("validateCapacityCounts: a Hooman only ticket may bring no furbaby on a furbaby-capacity event", () => {
  assert.match(validateCapacityCounts("furbaby", 1, 0).error, /at least one furbaby/);
  assert.deepEqual(validateCapacityCounts("furbaby", 2, 0, { allowNoFurbaby: true }), { units: 0 });
});
