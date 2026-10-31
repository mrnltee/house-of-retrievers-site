import { test } from "node:test";
import assert from "node:assert/strict";
import { BENEFICIARY_LETTER, cleanBeneficiary } from "./beneficiaries.mjs";
import { LETTER_STARTERS, fillLetter, recipientFields } from "./letters.mjs";

test("a beneficiary needs a name; kind, status, email and website are checked", () => {
  assert.match(cleanBeneficiary({}).error, /name/);
  assert.match(cleanBeneficiary({ name: "X", contactEmail: "bad" }).error, /email/);
  const { beneficiary: b } = cleanBeneficiary({ name: "  Paws  Haven ", kind: "nope", status: "talking", website: "pawshaven.ph", address: "1 Road\r\n\r\nQC" });
  assert.equal(b.name, "Paws Haven");
  assert.equal(b.kind, "shelter");
  assert.equal(b.status, "talking");
  assert.equal(b.website, "https://pawshaven.ph");
  assert.equal(b.address, "1 Road\nQC");
});

test("the beneficiary letter exists and its address block fills from the record", () => {
  const letter = LETTER_STARTERS.find((l) => l.key === BENEFICIARY_LETTER);
  assert.ok(letter);
  const to = recipientFields({ beneficiary: { name: "Paws Haven", contact_name: "Maria Santos", address: "1 Road\nQC", salutation: "Ms. Maria" } });
  assert.match(fillLetter(letter.body, to), /Maria Santos\nPaws Haven\n1 Road\nQC\n\n[\s\S]*Dear Ms\. Maria:/);
});
