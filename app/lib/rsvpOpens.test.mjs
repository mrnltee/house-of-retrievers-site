import test from "node:test";
import assert from "node:assert/strict";
import { countdownParts, formatOpens, manilaInstant, manilaParts, opensLater, readOpensAt } from "./rsvpOpens.mjs";
import { publicStatus, toPublicEvent, validateEvent } from "./admin/events.mjs";

test("Manila times in and out", () => {
  assert.equal(manilaInstant("2026-11-01", "12:00"), "2026-11-01T04:00:00.000Z");
  assert.deepEqual(manilaParts("2026-11-01T04:00:00.000Z"), { date: "2026-11-01", time: "12:00" });
  assert.equal(manilaInstant("2026-11-01", ""), null);
  assert.equal(formatOpens("2026-11-01T04:00:00.000Z"), "Sun, Nov 1 · 12:00 PM");
  assert.deepEqual(countdownParts(((2 * 24 + 4) * 3600 + 13 * 60 + 22) * 1000), { days: 2, hours: 4, minutes: 13, seconds: 22 });
  assert.deepEqual(countdownParts(-5000), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test("the opening has to come before the event ends", () => {
  const end = Date.parse("2026-11-08T16:00:00+08:00");
  assert.equal(readOpensAt({}, end).value, null);
  assert.equal(readOpensAt({ rsvpOpensOn: "on", rsvpOpensDate: "2026-11-01", rsvpOpensTime: "12:00" }, end).value, "2026-11-01T04:00:00.000Z");
  assert.match(readOpensAt({ rsvpOpensOn: "on", rsvpOpensDate: "2026-11-01" }, end).error, /date and time/);
  assert.match(readOpensAt({ rsvpOpensOn: "on", rsvpOpensDate: "2026-11-09", rsvpOpensTime: "09:00" }, end).error, /before the event ends/);
  const { value } = validateEvent({ title: "Run", date: "2099-11-08", registration: "required", rsvpOpensOn: "on", rsvpOpensDate: "2099-11-01", rsvpOpensTime: "12:00" });
  assert.equal(value.rsvpOpensAt, "2099-11-01T04:00:00.000Z");
});

test("status counts down, then shows the open status", () => {
  const row = { status: "published", registration: "required", rsvp_open: true, capacity: 10, rsvp_opens_at: "2026-11-01T04:00:00.000Z", date: "2026-11-08", title: "Run", slug: "run", venue: "V", city: "C" };
  assert.equal(publicStatus(row, 0, Date.parse("2026-10-31T00:00:00Z")), "soon");
  assert.equal(publicStatus(row, 0, Date.parse("2026-11-01T04:00:00Z")), "open");
  assert.equal(publicStatus(row, 10, Date.parse("2026-11-02T00:00:00Z")), "full");
  assert.equal(opensLater(null), false);
  const pub = toPublicEvent(row, 10);
  assert.equal(pub.openStatus, "full");
  assert.equal(pub.rsvpOpensAt, "2026-11-01T04:00:00.000Z");
});
