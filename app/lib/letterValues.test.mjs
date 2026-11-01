import { test } from "node:test";
import assert from "node:assert/strict";
import { letterValues } from "./letters.mjs";

const blanks = [{ label: "HOR Bank" }, { label: "Event Name" }, { label: "Contact Person" }, { label: "Booth Size", suggestion: "e.g. 3x3 m" }];

test("the PDF fills blanks like the page view: Payment settings, then typed, then saved/event details, then the sample", () => {
  const v = letterValues(blanks, {
    forced: { "HOR Bank": "Security Bank" },
    typed: { "HOR Bank": "Typed Bank", "Contact Person": "Angelique" },
    known: { "Event Name": "Golden Beginning", "Contact Person": "Saved person" },
    sample: true,
  });
  assert.deepEqual(v, { "HOR Bank": "Security Bank", "Event Name": "Golden Beginning", "Contact Person": "Angelique", "Booth Size": "e.g. 3x3 m" });
});

test("without the sample, an unknown blank stays empty (the send page asks for it)", () => {
  assert.equal(letterValues([{ label: "Booth Size" }], {})["Booth Size"], "");
});
