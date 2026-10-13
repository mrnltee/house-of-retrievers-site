import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEMES, activeTheme, isThemeActive, validateTheme } from "./seasonalThemes.mjs";

const manilaDate = (iso) => new Date(`${iso}T04:00:00Z`);

test("seasonal windows use the requested Manila dates", () => {
  assert.equal(activeTheme(DEFAULT_THEMES, manilaDate("2026-11-02")).id, "halloween");
  assert.equal(activeTheme(DEFAULT_THEMES, manilaDate("2026-11-03")).id, "holiday");
  assert.equal(activeTheme(DEFAULT_THEMES, manilaDate("2026-11-30")).id, "sparkling");
  assert.equal(activeTheme(DEFAULT_THEMES, manilaDate("2026-12-01")).id, "holiday");
  assert.equal(activeTheme(DEFAULT_THEMES, manilaDate("2027-01-08")).id, "new-year");
  assert.equal(activeTheme(DEFAULT_THEMES, manilaDate("2027-01-09")), null);
});

test("overlapping themes use priority", () => {
  assert.equal(activeTheme([{ id: "low", starts_month: 11, starts_day: 1, ends_month: 11, ends_day: 30, enabled: true, priority: 1 }, { id: "high", starts_month: 11, starts_day: 30, ends_month: 11, ends_day: 30, enabled: true, priority: 20 }], manilaDate("2026-11-30")).id, "high");
  assert.equal(isThemeActive({ starts_month: 12, starts_day: 26, ends_month: 1, ends_day: 8, enabled: true }, manilaDate("2027-01-01")), true);
});

test("admin theme fields are validated", () => {
  assert.equal(validateTheme({ id: "x", label: "X", startsMonth: 2, startsDay: 29, endsMonth: 3, endsDay: 1, logoVariant: "x" }).error, undefined);
  assert.match(validateTheme({ id: "x", label: "X", startsMonth: 2, startsDay: 30, endsMonth: 3, endsDay: 1 }).error, /start date/);
});
