import test from "node:test";
import assert from "node:assert/strict";
import { eventEndsAt, hasEnded } from "./eventTime.mjs";

const at = (iso) => Date.parse(iso);

test("an event with an end time is over at the end time (Manila)", () => {
  const run = { date: "2026-10-11", startTime: "06:00", endTime: "09:00" };
  assert.equal(hasEnded(run, at("2026-10-11T08:59:00+08:00")), false);
  assert.equal(hasEnded(run, at("2026-10-11T09:00:00+08:00")), true);
  assert.equal(hasEnded(run, at("2026-10-12T00:02:00+08:00")), true);
});

test("only a start time: three hours later, never past midnight", () => {
  assert.equal(eventEndsAt({ date: "2026-10-17", startTime: "13:00" }), at("2026-10-17T16:00:00+08:00"));
  assert.equal(eventEndsAt({ date: "2026-10-17", startTime: "22:30" }), at("2026-10-18T00:00:00+08:00"));
});

test("all day or no times: over at midnight", () => {
  assert.equal(eventEndsAt({ date: "2026-10-17", allDay: true, startTime: "09:00" }), at("2026-10-18T00:00:00+08:00"));
  assert.equal(eventEndsAt({ date: "2026-10-17" }), at("2026-10-18T00:00:00+08:00"));
  assert.equal(hasEnded({ date: "bad" }), false);
});
