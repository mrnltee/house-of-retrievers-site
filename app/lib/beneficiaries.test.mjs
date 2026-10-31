import { test } from "node:test";
import assert from "node:assert/strict";
import { BENEFICIARY_LETTER, cleanBeneficiary } from "./beneficiaries.mjs";
import { LETTER_STARTERS, fillLetter, recipientFields } from "./letters.mjs";

test("a beneficiary needs a name; kind, status, email and website are checked", () => {
  assert.match(cleanBeneficiary({}).error, /name/);
  assert.match(cleanBeneficiary({ name: "X", contactEmail: "bad" }).error, /email/);
  const { beneficiary: b } = cleanBeneficiary({ name: "  Paws  Haven ", kind: "nope", status: "talking", website: "pawshaven.ph", street: "1 Road\r\n\r\nBldg 2", barangay: "Brgy. San Roque", city: "Quezon City", province: "Metro Manila", postalCode: "1109" });
  assert.equal(b.name, "Paws Haven");
  assert.equal(b.kind, "shelter");
  assert.equal(b.status, "talking");
  assert.equal(b.website, "https://pawshaven.ph");
  assert.equal(b.address, "1 Road\nBldg 2\nBrgy. San Roque, Quezon City\nMetro Manila 1109");
  assert.equal(b.location, "Quezon City, Metro Manila");
});

test("the beneficiary letter exists and its address block fills from the record", () => {
  const letter = LETTER_STARTERS.find((l) => l.key === BENEFICIARY_LETTER);
  assert.ok(letter);
  const to = recipientFields({ beneficiary: { name: "Paws Haven", contact_name: "Maria Santos", address: "1 Road\nQC", salutation: "Ms. Maria" } });
  assert.match(fillLetter(letter.body, to), /Maria Santos\nPaws Haven\n1 Road\nQC\n\n[\s\S]*Dear Ms\. Maria:/);
});

test("the website shows only switched-on Partnered or Ended beneficiaries with a short line", async () => {
  const { isPublicBeneficiary, cleanBeneficiary: clean } = await import("./beneficiaries.mjs");
  const row = { show_on_site: true, status: "partnered", blurb: "Rescues senior dogs." };
  assert.equal(isPublicBeneficiary(row), true);
  assert.equal(isPublicBeneficiary({ ...row, status: "ended" }), true);
  assert.equal(isPublicBeneficiary({ ...row, status: "talking" }), false);
  assert.equal(isPublicBeneficiary({ ...row, show_on_site: false }), false);
  assert.equal(isPublicBeneficiary({ ...row, blurb: "  " }), false);
  const { beneficiary } = clean({ name: "Paws", showOnSite: "on", blurb: "  Rescues   dogs. " });
  assert.equal(beneficiary.showOnSite, true);
  assert.equal(beneficiary.blurb, "Rescues dogs.");
  assert.equal(clean({ name: "Paws" }).beneficiary.showOnSite, false);
});

test("public beneficiary: matched events, years and no contact details", async () => {
  const { eventsFor, publicBeneficiary, yearsLine } = await import("./beneficiaries.mjs");
  const events = [
    { slug: "c", title: "Golden Beginning", date: "2026-11-30", supports: "Pawssion Project" },
    { slug: "b", title: "Pawres de Mayo", date: "2025-05-17", supports: "Pawssion Project Foundation Inc. and Little Sisters" },
    { slug: "a", title: "Other", date: "2024-03-01", supports: "Someone else" },
  ];
  const mine = eventsFor("Pawssion Project Foundation Inc.", events);
  assert.deepEqual(mine.map((e) => e.slug), ["c", "b"]);
  const row = { id: "1", name: "Pawssion Project Foundation Inc.", kind: "rescue", status: "partnered", blurb: "Rescues.", instagram: "@pawssion", contact_email: "x@y.ph", notes: "secret", address: "1 Road", photo: "/p.jpg" };
  const pub = publicBeneficiary(row, mine);
  assert.equal(pub.instagram, "https://www.instagram.com/pawssion/");
  assert.equal(pub.logo, "/p.jpg");
  assert.equal(pub.kind, "Rescue group");
  assert.equal(yearsLine(pub), "Since 2025");
  assert.equal(yearsLine({ ...pub, current: false }), "2025–2026");
  assert.equal(yearsLine({ current: false, from: 2025, to: 2025 }), "2025");
  assert.equal(yearsLine({ current: true, from: null }), "");
  const text = JSON.stringify(pub);
  for (const secret of ["x@y.ph", "secret", "1 Road"]) assert.ok(!text.includes(secret));
});
