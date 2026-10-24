import test from "node:test";
import assert from "node:assert/strict";
import { cleanJourneyOrientation, cleanJourneyShow } from "./journeySettings.mjs";

test("journey orientation accepts only the two layouts", () => {
  assert.equal(cleanJourneyOrientation("horizontal"), "horizontal");
  assert.equal(cleanJourneyOrientation("vertical"), "vertical");
  assert.equal(cleanJourneyOrientation("sideways"), "vertical");
  assert.equal(cleanJourneyOrientation(undefined), "vertical");
});

test("journey show accepts a checkbox's on/off values", () => {
  assert.equal(cleanJourneyShow("on"), true);
  assert.equal(cleanJourneyShow(true), true);
  assert.equal(cleanJourneyShow(null), false);
  assert.equal(cleanJourneyShow(undefined), false);
  assert.equal(cleanJourneyShow("off"), false);
});
