import { test } from "node:test";
import assert from "node:assert/strict";
import { ageLabel, agesToday, cleanAges, humanYears, humanYearsLabel, readAge } from "./furbabyAge.mjs";

test("readAge keeps 0–30 years to one decimal", () => {
  assert.equal(readAge("3"), 3);
  assert.equal(readAge(" 2,5 "), 2.5);
  assert.equal(readAge("0.25"), 0.3);
  assert.equal(readAge(""), null);
  assert.equal(readAge("0"), null);
  assert.equal(readAge("31"), null);
  assert.equal(readAge("abc"), null);
});

test("cleanAges keeps one per furbaby, null when none given", () => {
  assert.deepEqual(cleanAges(["3", "", "x", "2.5"], 3), ["3", "", ""]);
  assert.deepEqual(cleanAges(["", ""], 2), null);
  assert.deepEqual(cleanAges("4", 1), ["4"]);
  assert.equal(cleanAges(["3"], 0), null);
});

test("humanYears follows 15, then +9, then +5 a year", () => {
  assert.equal(humanYears(0.5), 8);
  assert.equal(humanYears(1), 15);
  assert.equal(humanYears(2), 24);
  assert.equal(humanYears(3), 29);
  assert.equal(humanYears(10), 64);
  assert.equal(humanYears(""), null);
  assert.equal(humanYearsLabel(3), "About 29 in human years");
});

test("ageLabel uses months under a year", () => {
  assert.equal(ageLabel("0.5"), "6 mo");
  assert.equal(ageLabel("1"), "1 yr");
  assert.equal(ageLabel("2.5"), "2.5 yrs");
  assert.equal(ageLabel(""), "");
});

test("agesToday grows People ages, except angels", () => {
  const now = new Date("2027-05-10T00:00:00Z");
  assert.deepEqual(agesToday(["3", "", "2.5", "0.5"], "2026-05-01", { now }), ["4", "", "3.5", "1.5"]);
  assert.deepEqual(agesToday(["3", "5"], "2025-05-01", { rainbow: [false, true], now }), ["5", "5"]);
  assert.deepEqual(agesToday(["3"], null, { now }), ["3"]);
  assert.equal(agesToday(null, "2026-01-01"), null);
});
