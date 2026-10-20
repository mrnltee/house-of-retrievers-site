import test from "node:test";
import assert from "node:assert/strict";
import { cleanMediaProfile, cleanMediaTimeline, cleanTimelineOrientation } from "./mediaHub.mjs";

test("media timeline keeps fields and approved thumbnails", () => {
  assert.deepEqual(cleanMediaTimeline(JSON.stringify([
    { activity: "  Pawres de Mayo ", date: "17 May 2026", location: "Parklinks", purpose: "Rescue support", thumbnail: "/1-purpaws/purpaw1.jpg", ignored: "no" },
    { activity: "Nope", thumbnail: "https://example.com/private.jpg" },
  ])), [
    { activity: "Pawres de Mayo", date: "17 May 2026", location: "Parklinks", purpose: "Rescue support", thumbnail: "/1-purpaws/purpaw1.jpg" },
    { activity: "Nope", date: "", location: "", purpose: "", thumbnail: "" },
  ]);
});

test("media timeline ignores malformed input and caps entries", () => {
  assert.deepEqual(cleanMediaTimeline("not json"), []);
  assert.equal(cleanMediaTimeline(Array.from({ length: 15 }, (_, index) => ({ activity: String(index) }))).length, 12);
});

test("timeline orientation accepts only the two layouts", () => {
  assert.equal(cleanTimelineOrientation("horizontal"), "horizontal");
  assert.equal(cleanTimelineOrientation("diagonal"), "vertical");
});

test("media profile keeps three proof cards and approved image choices", () => {
  const profile = cleanMediaProfile({ title: "Briefing", cards: [{ value: "1", label: "Story", note: "Note" }], images: [{ src: "/1-purpaws/purpaw1.jpg", alt: "A moment", caption: "Purpose" }, { src: "/private.jpg" }] });
  assert.equal(profile.title, "Briefing");
  assert.equal(profile.cards.length, 1);
  assert.equal(profile.images[0].src, "/1-purpaws/purpaw1.jpg");
  assert.equal(profile.images[1].src, "");
});
