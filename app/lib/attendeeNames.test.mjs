import test from "node:test";
import assert from "node:assert/strict";
import { cleanGuestNames, cleanRainbow, joinFurbabyNames, livingFurbabyNames, sheetFurbabyNames, splitFurbabyNames } from "./attendeeNames.mjs";

test("cleanGuestNames: the other hoomans' names, trimmed, one per extra person", () => {
  assert.deepEqual(cleanGuestNames(["  Ben   Cruz ", "", "Cara"], 3), ["Ben Cruz", ""]);
  assert.equal(cleanGuestNames(["", ""], 3), null);
  assert.equal(cleanGuestNames(["Ben"], 1), null);
  assert.equal(cleanGuestNames("nope", 2), null);
  assert.equal(cleanGuestNames(["x".repeat(200)], 2)[0].length, 120);
});

test("joinFurbabyNames: per-furbaby names become the one furbaby line", () => {
  assert.equal(joinFurbabyNames(["Mochi", " Fudge ", ""], 3), "Mochi, Fudge");
  assert.equal(joinFurbabyNames(["Mochi", "Fudge"], 1), "Mochi");
  assert.equal(joinFurbabyNames([], 2), "");
});

test("splitFurbabyNames: one name per furbaby from the saved line", () => {
  assert.deepEqual(splitFurbabyNames("Khalee and Audrey"), ["Khalee", "Audrey"]);
  assert.deepEqual(splitFurbabyNames("Mochi, Fudge & Pao"), ["Mochi", "Fudge", "Pao"]);
  assert.deepEqual(splitFurbabyNames("Java, Coco, and Bink"), ["Java", "Coco", "Bink"]);
  assert.deepEqual(splitFurbabyNames("Sandy"), ["Sandy"]);
  assert.deepEqual(splitFurbabyNames("Brandy"), ["Brandy"]);
  assert.deepEqual(splitFurbabyNames(""), []);
  assert.deepEqual(splitFurbabyNames(null), []);
});

test("cleanRainbow: which furbabies crossed the rainbow bridge, by position", () => {
  assert.deepEqual(cleanRainbow([false, true], 2), [false, true]);
  assert.deepEqual(cleanRainbow(["on", "", "true"], 3), [true, false, true]);
  assert.equal(cleanRainbow([false, false], 2), null);
  assert.deepEqual(cleanRainbow([true, true, true], 2), [true, true]);
  assert.equal(cleanRainbow("nope", 2), null);
});

test("livingFurbabyNames: the furbabies still with them, for emails", () => {
  assert.equal(livingFurbabyNames("Khalee, Audrey", [false, true]), "Khalee");
  assert.equal(livingFurbabyNames("Khalee and Audrey", null), "Khalee and Audrey");
  assert.equal(livingFurbabyNames("Bink", [true]), "");
  assert.equal(livingFurbabyNames("Java, Coco, Bink", [false, true, false]), "Java and Bink");
});

test("sheetFurbabyNames: a rainbow next to the ones remembered", () => {
  assert.equal(sheetFurbabyNames(["Khalee", "Audrey"], [false, true], 2), "Khalee, Audrey 🌈");
  assert.equal(sheetFurbabyNames(["Mochi"], null, 1), "Mochi");
  assert.equal(sheetFurbabyNames(["", "Coco"], [true, false], 2), "Coco");
});
