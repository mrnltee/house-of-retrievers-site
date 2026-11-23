import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAT_EMOJI, insertAtCursor } from "./chatEmoji.mjs";

test("every preset emoji has a name and appears once", () => {
  const all = CHAT_EMOJI.flatMap((g) => g.items);
  assert.ok(all.length >= 16);
  for (const [emoji, name] of all) assert.ok(emoji && name, `${emoji} has a name`);
  assert.equal(new Set(all.map(([e]) => e)).size, all.length);
  assert.ok(all.some(([e]) => e === "🐾"), "has paw prints");
});

test("inserts at the cursor, replaces a selection, keeps under the limit", () => {
  assert.deepEqual(insertAtCursor("Hi team", "🐾", 2), { text: "Hi🐾 team", cursor: 4, fits: true });
  assert.deepEqual(insertAtCursor("Hi team", "👍", 3, 7), { text: "Hi 👍", cursor: 5, fits: true });
  assert.deepEqual(insertAtCursor("", "🎉"), { text: "🎉", cursor: 2, fits: true });
  assert.deepEqual(insertAtCursor("abc", "🎉", 99), { text: "abc🎉", cursor: 5, fits: true });
  assert.deepEqual(insertAtCursor("abcd", "🎉", 4, 4, 5), { text: "abcd", cursor: 4, fits: false });
});
