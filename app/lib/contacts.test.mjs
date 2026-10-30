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
    { category: "media", name: "Jane Doe", email: "j@x.ph", organization: null, phone: null, handle: null, notes: null });
});
