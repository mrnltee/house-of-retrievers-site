import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTACT_CATEGORIES, cleanContact, letterFor } from "./contacts.mjs";
import { LETTER_STARTERS } from "./letters/starters.mjs";

test("every category matches a letter in the system", () => {
  const keys = LETTER_STARTERS.map((l) => l.key);
  for (const c of CONTACT_CATEGORIES) assert.ok(keys.includes(c.letter), `${c.key} → ${c.letter}`);
  assert.equal(letterFor("influencer"), "invite-creators");
  assert.equal(letterFor("nope"), "");
});

test("contacts need a category and a name; email is checked", () => {
  assert.match(cleanContact({ name: "X" }).error, /category/);
  assert.match(cleanContact({ category: "vip" }).error, /name/);
  assert.match(cleanContact({ category: "vip", name: "X", email: "bad" }).error, /email/);
  assert.deepEqual(cleanContact({ category: "media", name: "  Jane   Doe ", email: "J@X.PH", organization: "" }).contact,
    { category: "media", name: "Jane Doe", email: "j@x.ph", specification: null, organization: null, phone: null, handle: null, address: null, salutation: null, repName: null, repEmail: null, repPhone: null, sendTo: "person", notes: null });
});

test("a group's letter: the admin's choice, else the default", async () => {
  const { LETTER_GROUPS } = await import("./contacts.mjs");
  assert.equal(letterFor("media", { media: "my-press-note-ab12" }), "my-press-note-ab12");
  assert.equal(letterFor("media", {}), "invite-media");
  assert.equal(letterFor("beneficiary"), "beneficiary-proposal");
  assert.ok(LETTER_GROUPS.some((g) => g.key === "beneficiary"));
});

test("a guest's letter goes to the person, the representative, or both", async () => {
  const { letterEmails } = await import("./contacts.mjs");
  const c = { email: "anne@x.ph", rep_email: "mgr@x.ph" };
  assert.deepEqual(letterEmails({ ...c, send_to: "person" }), { to: "anne@x.ph", cc: [] });
  assert.deepEqual(letterEmails({ ...c, send_to: "representative" }), { to: "mgr@x.ph", cc: [] });
  assert.deepEqual(letterEmails({ ...c, send_to: "both" }), { to: "anne@x.ph", cc: ["mgr@x.ph"] });
  assert.deepEqual(letterEmails({ rep_email: "mgr@x.ph", send_to: "person" }), { to: "mgr@x.ph", cc: [] });
  assert.match(cleanContact({ category: "vip", name: "X", repEmail: "bad" }).error, /representative/);
});

test("guest specification: kept, and picks the category when none is chosen", async () => {
  const { cleanContact, categoryForSpecification } = await import("./contacts.mjs");
  assert.equal(categoryForSpecification("Petfluencer"), "influencer");
  assert.equal(categoryForSpecification("  celebrity /  actress "), "celebrity");
  assert.equal(categoryForSpecification("Media Personality / News Anchor"), "media");
  assert.equal(categoryForSpecification("Chef"), null);
  assert.equal(cleanContact({ name: "Mavey Wavey", specification: "Petfluencer" }).contact.category, "influencer");
  assert.equal(cleanContact({ name: "Ricky Isla", specification: "VIP", category: "media" }).contact.category, "media");
  assert.equal(cleanContact({ name: "Someone", specification: "Chef" }).error, "Pick a category.");
  assert.equal(cleanContact({ name: "Someone", category: "vip", specification: "Chef" }).contact.specification, "Chef");
  assert.equal(cleanContact({ name: "Someone", category: "vip" }).contact.specification, null);
});
