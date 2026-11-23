import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { MEDIA_STORIES, storyCards } from "./mediaStories.mjs";
import { DEFAULT_MEDIA_TIMELINE } from "./mediaHub.mjs";

test("saved Stories lines become their story's card, in their order", () => {
  const cards = storyCards([
    "Pawres de Mayo · 17 May 2026 · Parklinks Pet Park",
    "Purpose to Care visit · Milagros Elderly Home Care and Services",
    "HoR × Beagle Buddies PH Community Pack Walk · 23 August 2026",
  ]);
  assert.deepEqual(cards.map((c) => c.story?.key), ["pawres-de-mayo", "milagros", "beagle-buddies", "free-hugs"]);
  assert.equal(cards[1].text, "Purpose to Care visit · Milagros Elderly Home Care and Services");
  assert.match(cards[3].text, /Last Sunday of every month/);
});

test("a line no story matches stays a plain card", () => {
  const cards = storyCards(["Something new"]);
  assert.equal(cards[0].story, null);
  assert.equal(cards[0].title, "");
  assert.equal(cards.length, 1 + MEDIA_STORIES.length);
});

test("each story is used once", () => {
  const cards = storyCards(["Pawres de Mayo", "Pawres de Mayo again"]);
  assert.equal(cards.filter((c) => c.story?.key === "pawres-de-mayo").length, 1);
});

test("every story photo exists and has alt text", () => {
  for (const story of MEDIA_STORIES) {
    assert.ok(story.paragraphs.length >= 3, story.key);
    for (const photo of story.photos) {
      assert.ok(existsSync(new URL(`../../public${photo.src}`, import.meta.url)), photo.src);
      assert.ok(photo.alt.length > 10, photo.src);
    }
  }
});

test("built-in timeline thumbnails come from each activity's own photos", () => {
  const own = { "Pawres de Mayo": "pawres-de-mayo", "Visit to Milagros Elderly Shelter": "milagros", "Pack walk with Beagle Buddies PH": "beagle", "Monthly Free Hugs": "freehugs", "International Free Hugs Day": "free-hugs-day" };
  for (const [activity, folder] of Object.entries(own)) {
    const row = DEFAULT_MEDIA_TIMELINE.find((r) => r.activity === activity);
    assert.ok(row, activity);
    assert.ok(row.thumbnail.includes(folder), `${activity}: ${row.thumbnail}`);
  }
});
