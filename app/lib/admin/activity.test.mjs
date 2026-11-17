import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { actionLabel } from "./activity.mjs";

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (name === "node_modules" || name.startsWith(".")) return [];
  return statSync(path).isDirectory() ? files(path) : /\.(m?js|jsx)$/.test(name) ? [path] : [];
});

test("every action written to the activity log has a readable label", () => {
  const app = new URL("../../", import.meta.url).pathname;
  const keys = new Set();
  for (const file of files(app)) {
    for (const m of readFileSync(file, "utf8").matchAll(/logActivity\([^,]+,\s*"([a-z._]+)"/g)) keys.add(m[1]);
  }
  assert.ok(keys.size > 20);
  const missing = [...keys].filter((key) => actionLabel(key) === key);
  assert.deepEqual(missing, []);
});

test("an action without a label still reads as words, never a dotted key", () => {
  assert.equal(actionLabel("event.something_new"), "Event something new");
  assert.equal(actionLabel(""), "");
});
