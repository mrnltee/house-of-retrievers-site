import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Owner, 16 Nov 2026: a link to another website always opens in a new tab, never the same one.
// This catches written-out https links; links built from data (href={x.url}) are checked by hand.
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "api" || name === "node_modules" ? [] : files(path);
    return /\.jsx?$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

test("every written-out https link opens in a new tab (rel noopener or noreferrer)", () => {
  const missing = [];
  for (const file of files("app")) {
    const source = readFileSync(file, "utf8");
    for (const [tag] of source.matchAll(/<a\b[^>]*\bhref="https?:\/\/[^"]*"[^>]*>/g)) {
      if (!/target="_blank"/.test(tag) || !/rel="[^"]*no(opener|referrer)/.test(tag)) missing.push(`${file}: ${tag.slice(0, 120)}`);
    }
  }
  assert.deepEqual(missing, []);
});
