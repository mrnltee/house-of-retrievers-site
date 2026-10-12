import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("Next 16 uses the proxy convention without the incompatible legacy favicon", () => {
  assert.equal(existsSync(`${root}middleware.js`), false);
  assert.equal(existsSync(`${root}proxy.js`), true);
  assert.match(readFileSync(`${root}proxy.js`, "utf8"), /export function proxy\(/);
  assert.equal(existsSync(`${root}app/favicon.ico`), false);
  assert.equal(existsSync(`${root}app/icon.png`), true);
});
