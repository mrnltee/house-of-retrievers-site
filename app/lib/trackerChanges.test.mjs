import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TRACKER_CHANGES, readTrackerChanges, savedMessage } from "./trackerChanges.mjs";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const fields = { reply: (v) => ["waiting", "yes", "no"].includes(v), onPage: (v) => v === "0" || v === "1" };

test("keeps well-formed changes only", () => {
  const text = JSON.stringify([
    { row: A, field: "reply", to: "yes" },
    { row: "not-an-id", field: "reply", to: "yes" },
    { row: B, field: "notes", to: "x" },
    { row: B, field: "reply", to: "maybe" },
    { row: B, field: "onPage", to: "1" },
    null,
  ]);
  assert.deepEqual(readTrackerChanges(text, fields), [{ row: A, field: "reply", to: "yes" }, { row: B, field: "onPage", to: "1" }]);
});

test("the last change to a row and field wins", () => {
  const text = JSON.stringify([{ row: A, field: "reply", to: "yes" }, { row: A, field: "reply", to: "no" }]);
  assert.deepEqual(readTrackerChanges(text, fields), [{ row: A, field: "reply", to: "no" }]);
});

test("bad input gives nothing, and the list is capped", () => {
  assert.deepEqual(readTrackerChanges("{oops", fields), []);
  assert.deepEqual(readTrackerChanges('{"row":1}', fields), []);
  const many = Array.from({ length: MAX_TRACKER_CHANGES + 5 }, (_, i) => ({ row: `${String(i).padStart(8, "0")}-1111-1111-1111-111111111111`, field: "reply", to: "yes" }));
  assert.equal(readTrackerChanges(JSON.stringify(many), fields).length, MAX_TRACKER_CHANGES);
});

test("savedMessage names what was saved and what wasn't", () => {
  assert.equal(savedMessage(["Ana: Coming."], []), "Saved 1 change: Ana: Coming.");
  assert.equal(savedMessage(["Ana: Coming.", "Ben: No."], ["Cara isn't on this list."]), "Saved 2 changes: Ana: Coming. Ben: No. One change wasn't saved: Cara isn't on this list.");
  assert.equal(savedMessage([], ["x.", "y."]), "2 changes weren't saved: x. y.");
});
