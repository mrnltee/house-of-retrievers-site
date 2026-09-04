import test from "node:test";
import assert from "node:assert/strict";

import * as brandMotion from "./brandMotion.mjs";

test("shows the brand intro on every page load despite an old session marker", () => {
  const storageWithOldMarker = {
    getItem: () => "seen",
  };

  assert.equal(brandMotion.shouldShowIntro(storageWithOldMarker), true);
  assert.equal(brandMotion.shouldShowIntro(storageWithOldMarker), true);
});

test("gives each page-load intro enough time to show both logo nods", () => {
  assert.equal(brandMotion.motionDurations?.intro, 4200);
  assert.equal(brandMotion.motionDurations?.interaction, 560);
  assert.equal(brandMotion.motionDurations?.reduced, 180);
});
