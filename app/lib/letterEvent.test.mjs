import { test } from "node:test";
import assert from "node:assert/strict";
import { EVENT_BLANKS, eventBlankValues } from "./letterEvent.mjs";

test("an event's title fills [Event Name] and [Event Short Name]", () => {
  assert.deepEqual(eventBlankValues("Golden Beginning: Paws and Purpose"), { "Event Name": "Golden Beginning: Paws and Purpose", "Event Short Name": "Golden Beginning" });
  assert.deepEqual(eventBlankValues("Retriever Romp"), { "Event Name": "Retriever Romp", "Event Short Name": "Retriever Romp" });
  assert.deepEqual(eventBlankValues("Pawres de Mayo – 2026"), { "Event Name": "Pawres de Mayo – 2026", "Event Short Name": "Pawres de Mayo" });
  assert.deepEqual(eventBlankValues(""), {});
  assert.deepEqual(EVENT_BLANKS, ["Event Name", "Event Short Name"]);
});
