import test from "node:test";
import assert from "node:assert/strict";
import { googleCalendarUrl, icsFile } from "./calendar.mjs";

const event = {
  slug: "bedazzle-barkdate", title: "Bedazzle Barkdate", date: "2026-10-17", startTime: "13:00", endTime: "16:00",
  venue: "Wiltlover Café, MetLive Mall", venueAddress: "Diosdado Macapagal Blvd", city: "Pasay", summary: "Bedazzle, shine; share the sparkle.",
};
const url = "https://events.houseofretrieversph.org/bedazzle-barkdate";

test("Google link carries Manila times and the place", () => {
  const link = new URL(googleCalendarUrl(event, url));
  assert.equal(link.searchParams.get("dates"), "20261017T130000/20261017T160000");
  assert.equal(link.searchParams.get("ctz"), "Asia/Manila");
  assert.equal(link.searchParams.get("location"), "Wiltlover Café, MetLive Mall, Diosdado Macapagal Blvd, Pasay");
});

test(".ics uses the Manila zone, escapes text and ends lines with CRLF", () => {
  const ics = icsFile(event, url, new Date("2026-10-11T00:00:00Z"));
  assert.match(ics, /DTSTART;TZID=Asia\/Manila:20261017T130000\r\n/);
  assert.match(ics, /DTEND;TZID=Asia\/Manila:20261017T160000\r\n/);
  assert.match(ics, /SUMMARY:Bedazzle Barkdate\r\n/);
  assert.match(ics, /Bedazzle\\, shine\\; share/);
  assert.ok(ics.split("\r\n").every((line) => line.length <= 75));
});

test("no start time: an all-day event; no end time: two hours", () => {
  assert.match(icsFile({ ...event, startTime: undefined, endTime: undefined }, url), /DTSTART;VALUE=DATE:20261017\r\nDTEND;VALUE=DATE:20261018/);
  assert.equal(new URL(googleCalendarUrl({ ...event, endTime: undefined }, url)).searchParams.get("dates"), "20261017T130000/20261017T150000");
});
