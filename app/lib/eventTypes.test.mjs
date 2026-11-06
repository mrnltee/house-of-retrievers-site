import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanEventType, cleanMonthsAhead, isLastSunday, isSocialType, lastSundayOf, nextLastSundays,
  participantsLabel, showsGuestList, snapToLastSunday,
} from "./eventTypes.mjs";

test("last Sunday of the month", () => {
  assert.equal(lastSundayOf(2026, 11), "2026-11-29");
  assert.equal(lastSundayOf(2026, 12), "2026-12-27");
  assert.equal(lastSundayOf(2027, 1), "2027-01-31"); // the 31st is itself a Sunday
  assert.equal(lastSundayOf(2028, 2), "2028-02-27"); // leap year
  assert.equal(lastSundayOf(2026, 2), "2026-02-22");
});

test("any date snaps to the last Sunday of its own month", () => {
  assert.equal(snapToLastSunday("2026-11-08"), "2026-11-29");
  assert.equal(snapToLastSunday("2026-11-29"), "2026-11-29");
  assert.equal(snapToLastSunday("nonsense"), null);
  assert.equal(isLastSunday("2026-11-29"), true);
  assert.equal(isLastSunday("2026-11-22"), false);
  assert.equal(isLastSunday(""), false);
});

test("the following months, across a year end", () => {
  assert.deepEqual(nextLastSundays("2026-11-29", 3), ["2026-12-27", "2027-01-31", "2027-02-28"]);
  assert.deepEqual(nextLastSundays("2026-11-29", 0), []);
  assert.deepEqual(nextLastSundays("bad", 3), []);
});

test("type rules: playdates are social, with no guest list, and have Participants", () => {
  assert.equal(cleanEventType("nope"), "standard");
  assert.equal(cleanEventType("monthly_playdate"), "monthly_playdate");
  assert.equal(isSocialType("playdate"), true);
  assert.equal(isSocialType("standard"), false);
  assert.equal(showsGuestList("standard"), true);
  assert.equal(showsGuestList("playdate"), false);
  assert.equal(showsGuestList("monthly_playdate"), false);
  assert.equal(participantsLabel("playdate"), "Participants");
  assert.equal(participantsLabel("standard"), "RSVPs");
});

test("months ahead is kept within 1 to 12", () => {
  assert.equal(cleanMonthsAhead("6"), 6);
  assert.equal(cleanMonthsAhead("0"), 1);
  assert.equal(cleanMonthsAhead("99"), 12);
  assert.equal(cleanMonthsAhead(undefined), 3);
});
