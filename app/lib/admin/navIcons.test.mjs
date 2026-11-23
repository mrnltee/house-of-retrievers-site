import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../../admin/(app)/layout.jsx", import.meta.url), "utf8");
const groups = layout.slice(layout.indexOf("const GROUPS"), layout.indexOf("];", layout.indexOf("const GROUPS")));
// ["a", "b"].map(page) and page("x") items, plus literal items' fourth value, e.g. ["Team chat", "/chat", "*", "chat"].
const mapped = [...groups.matchAll(/\[((?:"[a-z]+",? ?)+)\]\.map\(page\)/g)].flatMap((m) => [...m[1].matchAll(/"([a-z]+)"/g)].map((k) => k[1]));
const keys = [
  ...mapped,
  ...[...groups.matchAll(/page\("([a-z]+)"\)/g), ...groups.matchAll(/\["[^"]+", (?:null|"[^"]*"), (?:null|"[^"]*"), "([a-z]+)"\]/g)].map((m) => m[1]),
];

test("every sidebar item has an icon, so the collapsed sidebar never shows a blank row", async () => {
  const { NAV_ICONS } = await import("../../admin/(app)/navIcons.mjs");
  assert.ok(keys.length >= 20, `found ${keys.length} sidebar items`);
  assert.deepEqual(keys.filter((k) => !NAV_ICONS[k]), []);
});

test("every literal sidebar item names its icon key (fourth value)", () => {
  const literals = [...groups.matchAll(/\["[^"]+", (?:null|"[^"]*")[^\]]*\]/g)].map((m) => m[0]);
  assert.deepEqual(literals.filter((l) => !/, "[a-z]+"\]$/.test(l)), []);
});

test("sidebar icons are distinct", async () => {
  const { NAV_ICONS } = await import("../../admin/(app)/navIcons.mjs");
  const glyphs = Object.values(NAV_ICONS);
  assert.equal(new Set(glyphs).size, glyphs.length);
});

test("the pre-paint script and AdminNav share one storage key", () => {
  const nav = readFileSync(new URL("../../admin/(app)/AdminNav.jsx", import.meta.url), "utf8");
  const key = nav.match(/const NAV_KEY = "([^"]+)"/)[1];
  assert.ok(layout.includes(`localStorage.getItem("${key}")`));
});
