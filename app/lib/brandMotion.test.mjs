import test from "node:test";
import assert from "node:assert/strict";

import {
  INTRO_SESSION_KEY,
  markIntroSeen,
  shouldShowIntro,
} from "./brandMotion.mjs";

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
