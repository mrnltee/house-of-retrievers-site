import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseSheetDate, readSheet } from "./peopleImport.mjs";

const SHEET = `﻿Timestamp,Join type,Name,Email,Organization,Social profile,Furbaby name,Message,Status,Notes,Photo
10/10/2026 21:19:05,Member,Cybelle Latagan,LatagancyELLE@gmail.com,,,,"hello, ""pack""",New,,
10/9/2026 8:24:00,Volunteer,Chris,mtfabiano@icloud.com,,@Christflambago,,"line one
line two",Contacted,called him,View photo
10/8/2026 9:00:00,Member,No Email,,,,,,,,
10/8/2026 9:00:00,Visitor,Someone,someone@x.test,,,,,,,
10/7/2026 9:00:00,Member,Old Status,old@x.test,,,,,Waitlisted,,`;

test("CSV cells keep commas, quotes and line breaks", () => {
  const rows = parseCsv(SHEET);
  assert.equal(rows.length, 6);
  assert.equal(rows[1][7], 'hello, "pack"');
  assert.equal(rows[2][7], "line one\nline two");
});

test("sheet dates are read as Manila time", () => {
  assert.equal(parseSheetDate("10/10/2026 21:19:05").toISOString(), "2026-10-10T13:19:05.000Z");
  assert.equal(parseSheetDate("nonsense"), null);
});

test("rows become people; bad rows are skipped with a reason", () => {
  const { people, skipped } = readSheet(SHEET);
  assert.deepEqual(people.map((p) => p.email), ["latagancyelle@gmail.com", "mtfabiano@icloud.com", "old@x.test"]);
  assert.equal(people[1].status, "Contacted");
  assert.equal(people[1].socialProfile, "@Christflambago");
  assert.equal(people[2].status, "New");
  assert.equal(people[2].notes, "Sheet status: Waitlisted");
  assert.deepEqual(skipped.map((s) => s.reason), ["no valid email", 'unknown join type "Visitor"']);
});
