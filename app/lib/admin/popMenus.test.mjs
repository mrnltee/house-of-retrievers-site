import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Design review, 22 Nov 2026: a "More" menu that isn't a pop-menu stays open, stacks on other menus and
// gets covered by the next row. Every <details> menu in the admin must carry the shared pop-menu class.
test("every admin <details> More menu is a pop-menu", () => {
  const files = execFileSync("git", ["ls-files", "app/admin/*.jsx", "app/admin/**/*.jsx"], { encoding: "utf8" }).split("\n").filter(Boolean);
  const offenders = [];
  for (const file of files) {
    for (const m of readFileSync(file, "utf8").matchAll(/<details\b[^>]*className="([^"]*)"/g)) {
      const classes = m[1].split(/\s+/);
      if (classes.some((c) => /-more$|-menu$/.test(c)) && !classes.includes("pop-menu")) offenders.push(`${file}: ${m[1]}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("the admin layout mounts PopMenus", () => {
  assert.match(readFileSync("app/admin/(app)/layout.jsx", "utf8"), /<PopMenus \/>/);
});
