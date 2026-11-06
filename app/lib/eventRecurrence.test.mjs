import test from "node:test";
import assert from "node:assert/strict";
import { cleanRepeatCount, cleanRule, describeRule, nthWeekdayOf, occurrences } from "./eventRecurrence.mjs";

test("nth and last weekday of a month", () => {
  assert.equal(nthWeekdayOf(2026, 11, -1, 0), "2026-11-29"); // last Sunday
  assert.equal(nthWeekdayOf(2027, 1, -1, 0), "2027-01-31"); // the 31st is itself a Sunday
  assert.equal(nthWeekdayOf(2028, 2, -1, 0), "2028-02-27"); // leap year
  assert.equal(nthWeekdayOf(2026, 11, 1, 0), "2026-11-01"); // the 1st is a Sunday
  assert.equal(nthWeekdayOf(2026, 11, 2, 6), "2026-11-14"); // second Saturday
  assert.equal(nthWeekdayOf(2026, 11, 4, 4), "2026-11-26"); // fourth Thursday
  assert.equal(nthWeekdayOf(2026, 11, -1, 1), "2026-11-30"); // last Monday is the last day
});

test("every last Sunday of the month, from today, across a year end", () => {
  const rule = { nth: -1, weekday: 0, month: 0 };
  assert.deepEqual(occurrences(rule, "2026-11-07", 4), ["2026-11-29", "2026-12-27", "2027-01-31", "2027-02-28"]);
  // On the day itself it counts; a day later it moves to next month.
  assert.deepEqual(occurrences(rule, "2026-11-29", 1), ["2026-11-29"]);
  assert.deepEqual(occurrences(rule, "2026-11-30", 1), ["2026-12-27"]);
});

test("a named month repeats yearly", () => {
  const rule = { nth: 2, weekday: 6, month: 3 };
  assert.deepEqual(occurrences(rule, "2026-11-07", 3), ["2027-03-13", "2028-03-11", "2029-03-10"]);
  assert.equal(describeRule(rule), "Every second Saturday of March");
});

test("rules are checked and described", () => {
  assert.deepEqual(cleanRule({ nth: "-1", weekday: "0", month: "0" }), { nth: -1, weekday: 0, month: 0 });
  assert.equal(cleanRule({ nth: 5, weekday: 0 }), null);
  assert.equal(cleanRule({ nth: 1, weekday: 7 }), null);
  assert.equal(cleanRule({ nth: 1, weekday: 0, month: 13 }), null);
  assert.equal(cleanRule(null), null);
  assert.equal(describeRule({ nth: -1, weekday: 0, month: 0 }), "Every last Sunday of the month");
  assert.deepEqual(occurrences({ nth: 9 }, "2026-11-07", 3), []);
});

test("how many dates are set up stays within 1 to 12", () => {
  assert.equal(cleanRepeatCount("6"), 6);
  assert.equal(cleanRepeatCount("0"), 1);
  assert.equal(cleanRepeatCount("40"), 12);
  assert.equal(cleanRepeatCount(undefined), 3);
});
