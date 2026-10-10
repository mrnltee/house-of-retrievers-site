import test from "node:test";
import assert from "node:assert/strict";
import { manilaMonth, monthLabel, stopStatus, withOrg } from "./journeyStatus.mjs";
import { journey } from "../content/journey.js";

test("months before and after the current one ignore the upcoming flag", () => {
  assert.equal(stopStatus({ month: "2026-09", upcoming: true }, "2026-10"), "past");
  assert.equal(stopStatus({ month: "2026-11" }, "2026-10"), "upcoming");
});

test("within the current month the flag decides", () => {
  assert.equal(stopStatus({ month: "2026-10", upcoming: true }, "2026-10"), "upcoming");
  assert.equal(stopStatus({ month: "2026-10" }, "2026-10"), "past");
});

test("the month turns over at Manila midnight, not UTC", () => {
  assert.equal(manilaMonth(new Date("2026-10-31T16:30:00Z")), "2026-11");
  assert.equal(manilaMonth(new Date("2026-10-31T15:30:00Z")), "2026-10");
});

test("labels", () => {
  assert.equal(monthLabel("2026-05"), "May 2026");
});

test("the registered name is left out until released, and the sentence ends once", () => {
  const story = "House of Retrievers is now an officially registered organization[ as {org}]";
  assert.equal(withOrg(story, null), "House of Retrievers is now an officially registered organization.");
  assert.equal(withOrg(story, "The House of Retrievers Society Inc."), "House of Retrievers is now an officially registered organization as The House of Retrievers Society Inc.");
});

test("the timeline is in date order with unique ids", () => {
  const months = journey.map((stop) => stop.month);
  assert.deepEqual(months, [...months].sort());
  assert.equal(new Set(journey.map((stop) => stop.id)).size, journey.length);
  for (const stop of journey) for (const photo of stop.photos ?? []) assert.ok(photo.alt, `${stop.id} photo needs alt text`);
});
