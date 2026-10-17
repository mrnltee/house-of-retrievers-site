import test from "node:test";
import assert from "node:assert/strict";
import { WELCOME_COUNTDOWN_SECONDS, manualCheckInWarnings, readCheckInTime } from "./manualCheckIn.mjs";

const now = new Date("2026-12-20T08:00:00.000Z"); // 4:00 PM in Manila on the event day

test("a hand-entered time is read as Manila time", () => {
  assert.deepEqual(readCheckInTime({ date: "2026-12-20", time: "14:14" }, { eventDate: "2026-12-20", now }), { value: "2026-12-20T06:14:00.000Z" });
});

test("a time in the future is refused", () => {
  assert.match(readCheckInTime({ date: "2026-12-20", time: "16:30" }, { eventDate: "2026-12-20", now }).error, /future/);
});

test("a time before the event's day is refused; later days are fine", () => {
  assert.match(readCheckInTime({ date: "2026-12-19", time: "23:59" }, { eventDate: "2026-12-20", now }).error, /before the event/);
  assert.deepEqual(readCheckInTime({ date: "2026-12-20", time: "00:00" }, { eventDate: "2026-12-20", now }), { value: "2026-12-19T16:00:00.000Z" });
});

test("a missing or malformed time is refused", () => {
  assert.match(readCheckInTime({ date: "", time: "14:14" }, { eventDate: "2026-12-20", now }).error, /date and time/);
  assert.match(readCheckInTime({ date: "2026-12-20", time: "2pm" }, { eventDate: "2026-12-20", now }).error, /date and time/);
});

test("hand check-in warns, but doesn't block, when payment or acknowledgement is missing", () => {
  assert.deepEqual(manualCheckInWarnings({ fee_required: true, fee_status: "waiting" }), ["Payment not confirmed"]);
  assert.deepEqual(manualCheckInWarnings({ fee_required: true, fee_status: "paid", rsvp_form_config: { consentEnabled: true }, consent_completed_at: null }), ["Event acknowledgement not completed"]);
  assert.deepEqual(manualCheckInWarnings({ fee_required: false, fee_status: "not_due", rsvp_form_config: { consentEnabled: true }, consent_completed_at: "2026-12-01T00:00:00Z" }), []);
});

test("the welcome card returns to scanning after five seconds", () => {
  assert.equal(WELCOME_COUNTDOWN_SECONDS, 5);
});
