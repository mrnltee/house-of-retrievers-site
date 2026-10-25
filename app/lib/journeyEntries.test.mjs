import test from "node:test";
import assert from "node:assert/strict";
import { journey } from "../content/journey.js";
import { stopStatus } from "./journeyStatus.mjs";
import { cleanDate, cleanEntry, entryStatus, manilaDate, slugifyEntry, sortEntries, toStop } from "./journeyEntries.mjs";

test("dates: only real calendar days; today in Manila", () => {
  assert.equal(cleanDate("2026-10-11"), "2026-10-11");
  assert.equal(cleanDate("2026-02-30"), null);
  assert.equal(cleanDate("11/10/2026"), null);
  // 2026-10-24 17:00 UTC is already the 25th in Manila.
  assert.equal(manilaDate(new Date("2026-10-24T17:00:00Z")), "2026-10-25");
});

test("entry form: title required, text trimmed and capped, bad dates refused", () => {
  assert.equal(cleanEntry({ title: "  " }).error, "Give the stop a title.");
  assert.match(cleanEntry({ title: "Run", date: "2026-13-01" }).error, /real day/);
  const { value } = cleanEntry({ title: "  Weekend   Social Run ", place: "", mark: "first", story: "x".repeat(900), date: "2026-10-11" });
  assert.equal(value.title, "Weekend Social Run");
  assert.equal(value.place, null);
  assert.equal(value.mark, "first");
  assert.equal(value.story.length, 400);
  assert.equal(value.date, "2026-10-11");
  assert.equal(cleanEntry({ title: "x", mark: "banner" }).value.mark, null);
});

test("slugs are URL-safe", () => {
  assert.equal(slugifyEntry("A Golden Beginning: Paws & Purpose"), "a-golden-beginning-paws-purpose");
  assert.equal(slugifyEntry("Pawres de Máyo!"), "pawres-de-mayo");
  assert.equal(slugifyEntry("!!!"), "stop");
});

test("past or upcoming comes from the date, no hand-set flag", () => {
  const today = "2026-10-25";
  assert.equal(entryStatus({ happened_on: "2026-10-11" }, today), "past");
  assert.equal(entryStatus({ happened_on: "2026-10-25" }, today), "upcoming");
  assert.equal(entryStatus({ happened_on: "2026-11-08" }, today), "upcoming");
  assert.equal(entryStatus({ month: "2026-10" }, today), "past");
  assert.equal(entryStatus({ month: "2026-11" }, today), "upcoming");
  assert.equal(entryStatus({}, today), "upcoming");
});

test("order: by date, month-only as the 1st, then position, undated last", () => {
  const rows = [
    { slug: "soon", position: 0 },
    { slug: "romp", happened_on: "2026-11-08", position: 90 },
    { slug: "aug-b", month: "2026-08", position: 40 },
    { slug: "run", happened_on: "2026-10-11", position: 70 },
    { slug: "aug-a", month: "2026-08", position: 20 },
  ];
  assert.deepEqual(sortEntries(rows).map((r) => r.slug), ["aug-a", "aug-b", "run", "romp", "soon"]);
});

test("a row renders as the old stop; Journey.jsx's own status agrees with entryStatus", () => {
  const today = "2026-10-25";
  const row = { slug: "weekend-social-run", title: "Weekend Social Run", place: "Filinvest City, Alabang", happened_on: "2026-10-11", theme: null };
  const stop = toStop(row, [{ src: "/journey/weekend-social-run/1.jpg", alt: "Poster", fit: "contain" }], today);
  assert.deepEqual(stop, { id: "weekend-social-run", title: "Weekend Social Run", month: "2026-10", place: "Filinvest City, Alabang", photos: [{ src: "/journey/weekend-social-run/1.jpg", alt: "Poster", fit: "contain" }] });
  for (const happened_on of ["2026-10-11", "2026-10-30", "2026-11-08", "2026-09-01"]) {
    const s = toStop({ slug: "x", title: "x", happened_on }, [], today);
    assert.equal(stopStatus(s, today.slice(0, 7)), entryStatus({ happened_on }, today), happened_on);
  }
});

test("only a published event page is linked", () => {
  const base = { slug: "romp", title: "Retriever Romp", happened_on: "2026-11-08", event_slug: "retriever-romp" };
  assert.equal(toStop({ ...base, event_status: "published" }, []).event, "retriever-romp");
  assert.equal(toStop({ ...base, event_status: "draft" }, []).event, undefined);
});

test("the seed in migration 054 renders today's timeline unchanged", async () => {
  const { readFile } = await import("node:fs/promises");
  const sqlText = await readFile(new URL("../../db/migrations/054_journey_entries.sql", import.meta.url), "utf8");
  for (const stop of journey) {
    assert.match(sqlText, new RegExp(`VALUES \\('${stop.id}', `), `${stop.id} is seeded`);
    for (const photo of stop.photos || []) assert.ok(sqlText.includes(`'${photo.src}'`), photo.src);
  }
});
