import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A lost "}" (e.g. in a merge) silently nests every later rule inside the block above it, such as a phone-only
// @media query, and the desktop page loses those styles with no build error. Comments and strings are skipped.
for (const file of ["../../admin/admin.css", "../../globals.css"]) {
  test(`${file.split("/").pop()} has balanced braces`, () => {
    const css = readFileSync(new URL(file, import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
    let depth = 0;
    css.split("\n").forEach((line, i) => {
      for (const ch of line) {
        if (ch === "{") depth += 1;
        if (ch === "}") depth -= 1;
        assert.ok(depth >= 0, `extra "}" on line ${i + 1}`);
      }
    });
    assert.equal(depth, 0, "a block is never closed");
  });
}
