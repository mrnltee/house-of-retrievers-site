import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFormat } from "./letterFormat.mjs";

test("bold wraps the selection, and unwraps it again", () => {
  const on = applyFormat("bold", "Hello world", 6, 11);
  assert.deepEqual(on, { text: "Hello **world**", start: 8, end: 13 });
  assert.equal(applyFormat("bold", on.text, on.start, on.end).text, "Hello world");
  assert.equal(applyFormat("bold", "Hi ", 3, 3).text, "Hi **text**");
});

test("line marks apply to every selected line and swap each other", () => {
  assert.equal(applyFormat("bullet", "a\nb\nc", 0, 3).text, "- a\n- b\nc");
  assert.equal(applyFormat("bullet", "- a\n- b", 0, 7).text, "a\nb");
  assert.equal(applyFormat("h1", "## Title", 3, 3).text, "# Title");
  assert.equal(applyFormat("center", "x\nDear all", 4, 4).text, "x\n^ Dear all");
});

test("table and new page go on their own lines", () => {
  assert.equal(applyFormat("page", "One\nTwo", 3, 3).text, "One\n\n---page---\n\nTwo");
  assert.match(applyFormat("table", "", 0, 0).text, /^\|! Heading/);
});

test("link selects the address to type", () => {
  const r = applyFormat("link", "See portfolio", 4, 13);
  assert.equal(r.text, "See [portfolio](https://)");
  assert.equal(r.text.slice(r.start, r.end), "https://");
});
