import test from "node:test";
import assert from "node:assert/strict";

import * as brandMotion from "./brandMotion.mjs";

const {
  INTRO_SESSION_KEY,
  markIntroSeen,
  shouldShowIntro,
} = brandMotion;

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("shows the brand intro only once in a browser session", () => {
  const storage = memoryStorage();

  assert.equal(shouldShowIntro(storage), true);
  markIntroSeen(storage);
  assert.equal(storage.getItem(INTRO_SESSION_KEY), "seen");
  assert.equal(shouldShowIntro(storage), false);
});

test("still shows the intro when session storage is unavailable", () => {
  const unavailableStorage = {
    getItem() {
      throw new Error("Storage blocked");
    },
  };

  assert.equal(shouldShowIntro(unavailableStorage), true);
});

test("marking the intro is safe when session storage is unavailable", () => {
  const unavailableStorage = {
    setItem() {
      throw new Error("Storage blocked");
    },
  };

  assert.doesNotThrow(() => markIntroSeen(unavailableStorage));
});

test("gives the first-load intro enough time to show both logo nods", () => {
  assert.equal(brandMotion.motionDurations?.intro, 4200);
  assert.equal(brandMotion.motionDurations?.interaction, 560);
  assert.equal(brandMotion.motionDurations?.reduced, 180);
});
