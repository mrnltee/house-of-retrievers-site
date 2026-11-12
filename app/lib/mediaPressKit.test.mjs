import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BOILERPLATE_SHORT, DEFAULT_FACT_SHEET, FACT_SHEET_MAX_ROWS, factSheetText, parseFactSheet, plainText, pressKitFrom } from "./mediaPressKit.mjs";

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
