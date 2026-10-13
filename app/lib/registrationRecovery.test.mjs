import test from "node:test";
import assert from "node:assert/strict";
import { deletionState, sameRegistrant } from "./registrationRecovery.mjs";

test("shared email addresses are different registrations when names differ", () => {
  assert.equal(sameRegistrant({ name: "Ana Cruz", email: "family@example.com" }, { name: "Ben Cruz", email: "FAMILY@example.com" }), false);
  assert.equal(sameRegistrant({ name: " Ana   Cruz ", email: "Family@example.com" }, { name: "ana cruz", email: "family@example.com" }), true);
});

test("only unpaid, unchecked registrations can enter the 30-day recovery bin", () => {
  assert.equal(deletionState({ fee_status: "waiting", checked_in_at: null }), "allowed");
  assert.equal(deletionState({ fee_status: "paid", checked_in_at: null }), "paid");
  assert.equal(deletionState({ fee_status: "not_due", checked_in_at: new Date() }), "checked-in");
});

test("deleted registrations expire after 30 days", () => {
  const now = new Date("2026-10-13T00:00:00Z");
  assert.equal(deletionState({ deleted_at: "2026-09-14T00:00:01Z" }, now), "recoverable");
  assert.equal(deletionState({ deleted_at: "2026-09-13T00:00:00Z" }, now), "expired");
});
