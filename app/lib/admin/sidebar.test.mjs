import { test } from "node:test";
import assert from "node:assert/strict";

test("every page in PAGES is in the sidebar (layout.jsx GROUPS)", async () => {
  const { readFileSync } = await import("node:fs");
  const { PAGES } = await import("./roles.mjs");
  const layout = readFileSync(new URL("../../admin/(app)/layout.jsx", import.meta.url), "utf8");
  const missing = PAGES.filter((p) => !layout.includes(`"${p.key}"`)).map((p) => p.key);
  assert.deepEqual(missing, []);
});
