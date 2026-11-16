import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Owner, 16 Nov 2026: icons are lucide through app/components/Icon.jsx, never text symbols.
// "→" is allowed: in prose it means "then" ("File → Download", "Inquiry → Talking").
const GLYPHS = /[↗↓↑←‹›↻✦✕✓▶✎★⚠]/;

// Node can't import JSX, so read the icon names from the ICONS map in Icon.jsx.
const ICON_SOURCE = readFileSync("app/components/Icon.jsx", "utf8");
const ICON_NAMES = [...ICON_SOURCE.slice(ICON_SOURCE.indexOf("const ICONS = {"), ICON_SOURCE.indexOf("};", ICON_SOURCE.indexOf("const ICONS = {"))).matchAll(/^\s+([a-zA-Z]+):/gm)].map((m) => m[1]);

function jsxFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "api" ? [] : jsxFiles(path);
    return name.endsWith(".jsx") ? [path] : [];
  });
}

test("no text-symbol icons in JSX (comments aside)", () => {
  const found = [];
  for (const file of jsxFiles("app")) {
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      const code = line.trim();
      if (code.startsWith("*") || code.startsWith("//") || code.startsWith("/*")) return;
      if (GLYPHS.test(line)) found.push(`${file}:${i + 1}: ${code.slice(0, 100)}`);
    });
  }
  assert.deepEqual(found, []);
});

test("every <Icon name> used in the app exists in the icon map", () => {
  assert.ok(ICON_NAMES.length > 20, "read the icon map");
  const unknown = [];
  for (const file of jsxFiles("app")) {
    for (const [, name] of readFileSync(file, "utf8").matchAll(/<Icon name="([a-zA-Z]+)"/g)) {
      if (!ICON_NAMES.includes(name)) unknown.push(`${file}: ${name}`);
    }
  }
  assert.deepEqual(unknown, []);
});
