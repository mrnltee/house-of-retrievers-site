import { test } from "node:test";
import assert from "node:assert/strict";

test("every page in PAGES is in the sidebar (layout.jsx GROUPS), except ones opened from events", async () => {
  const { readFileSync } = await import("node:fs");
  const { PAGES } = await import("./roles.mjs");
  const layout = readFileSync(new URL("../../admin/(app)/layout.jsx", import.meta.url), "utf8");
  const missing = PAGES.filter((p) => !p.fromEvents && !layout.includes(`"${p.key}"`)).map((p) => p.key);
  assert.deepEqual(missing, []);
});

test("the guest list is opened from events, not the sidebar", async () => {
  const { readFileSync } = await import("node:fs");
  const { PAGES } = await import("./roles.mjs");
  const layout = readFileSync(new URL("../../admin/(app)/layout.jsx", import.meta.url), "utf8");
  assert.equal(PAGES.find((p) => p.key === "guests").fromEvents, true);
  assert.equal(layout.includes('"guests"'), false);
});
