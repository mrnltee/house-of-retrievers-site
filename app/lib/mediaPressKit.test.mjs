import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BOILERPLATE_SHORT, DEFAULT_FACT_SHEET, DEFAULT_STORY_ANGLES, FACT_SHEET_MAX_ROWS, STORY_ANGLES_MAX, boilerplatesText, cleanStoryAngles, factSheetText, parseFactSheet, photoAlt, plainText, pressKitFrom } from "./mediaPressKit.mjs";

test("fact sheet text round-trips and keeps colons in the detail", () => {
  assert.deepEqual(parseFactSheet(factSheetText(DEFAULT_FACT_SHEET)), DEFAULT_FACT_SHEET);
  assert.deepEqual(parseFactSheet("Launch: 30 November 2026, 2:30 PM\nno colon here\n: no label\nEmpty:"), [["Launch", "30 November 2026, 2:30 PM"]]);
});

test("fact sheet caps its rows", () => {
  const many = Array.from({ length: 30 }, (_, i) => `Row ${i}: detail`).join("\n");
  assert.equal(parseFactSheet(many).length, FACT_SHEET_MAX_ROWS);
});

test("plain text drops tags and decodes the hub's entities", () => {
  assert.equal(plainText("We&apos;re <strong>here</strong><br>to help &amp; serve <script>"), "We’re here to help & serve");
});

test("press kit falls back to the built-in wording and needs an explicit approval", () => {
  const kit = pressKitFrom({});
  assert.deepEqual(kit.factSheet, DEFAULT_FACT_SHEET);
  assert.equal(kit.boilerplateShort, DEFAULT_BOILERPLATE_SHORT);
  assert.equal(kit.boilerplatesApproved, false);
  assert.equal(pressKitFrom({ boilerplatesApproved: "true" }).boilerplatesApproved, false);
  const saved = pressKitFrom({ factSheet: "Name: HoR", boilerplateShort: "Short <em>one</em>", boilerplateLong: "One.\n\n\nTwo.", boilerplatesApproved: true, mission: "A <em>mission</em>" });
  assert.deepEqual(saved.factSheet, [["Name", "HoR"]]);
  assert.equal(saved.boilerplateShort, "Short one");
  assert.equal(saved.boilerplateLong, "One.\n\nTwo.");
  assert.equal(saved.boilerplatesApproved, true);
  assert.equal(saved.mission, "A mission");
});

test("story angles keep titled rows, plain text and approved photos only", () => {
  const rows = cleanStoryAngles(JSON.stringify([
    { title: " <b>Walk</b> ", meta: "23 August 2026", body: "Two groups, one walk.", photo: "/journey/beagle-buddies-pack-walk/5.jpg" },
    { title: "No body", body: "" },
    { title: "Bad photo", body: "Text", photo: "https://example.com/x.jpg" },
  ]));
  assert.deepEqual(rows, [
    { title: "Walk", meta: "23 August 2026", body: "Two groups, one walk.", photo: "/journey/beagle-buddies-pack-walk/5.jpg" },
    { title: "Bad photo", meta: "", body: "Text", photo: "" },
  ]);
  assert.deepEqual(cleanStoryAngles("not json"), []);
  assert.equal(cleanStoryAngles(Array.from({ length: 20 }, (_, i) => ({ title: `T${i}`, body: "b" }))).length, STORY_ANGLES_MAX);
});

test("press kit uses saved story angles, else the built-in ones; every built-in photo has alt text", () => {
  assert.deepEqual(pressKitFrom({}).storyAngles, DEFAULT_STORY_ANGLES);
  assert.deepEqual(pressKitFrom({ storyAngles: [] }).storyAngles, DEFAULT_STORY_ANGLES);
  assert.equal(pressKitFrom({ storyAngles: [{ title: "One", body: "Story" }] }).storyAngles.length, 1);
  for (const angle of DEFAULT_STORY_ANGLES) if (angle.photo) assert.ok(photoAlt(angle.photo), angle.photo);
});

test("boilerplates download is labelled and flags drafts", () => {
  const draft = boilerplatesText(pressKitFrom({}));
  assert.match(draft, /^The House of Retrievers’ Society, Inc\. — boilerplates/);
  assert.match(draft, /Draft for approval/);
  assert.match(draft, /SHORT \(about 50 words\)\n\n.+\n\nLONG/s);
  assert.doesNotMatch(boilerplatesText(pressKitFrom({ boilerplatesApproved: true })), /Draft for approval/);
});
