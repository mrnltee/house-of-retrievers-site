import test from "node:test";
import assert from "node:assert/strict";
import { LEGAL } from "./legal.mjs";
import { DEFAULT_FACT_SHEET } from "./mediaPressKit.mjs";

// Owner, 17 Nov 2026: the registration number is 2026090268846-04. The site footer, email footers and
// letter PDFs read LEGAL; the media hub's fact sheet must say the same number.
test("one SEC registration number everywhere", () => {
  assert.equal(LEGAL.sec, "2026090268846-04");
  const row = DEFAULT_FACT_SHEET.find(([label]) => label === "SEC registration");
  assert.ok(row && row[1].includes(LEGAL.sec), "fact sheet matches LEGAL.sec");
});
