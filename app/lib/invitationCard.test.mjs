import test from "node:test";
import assert from "node:assert/strict";
import { cardLayout, cardNames, cleanInvitation, isInvitation, readCardNames } from "./invitationCard.mjs";

const IMG = "/api/event-image/11111111-1111-1111-1111-111111111111";

test("cleanInvitation keeps only own images and clamps numbers", () => {
  const s = cleanInvitation({ on: "1", card: IMG, pages: [IMG, "https://evil.test/x.png", IMG, IMG, IMG], y: 5, nameSize: 2, orgSize: "30" });
  assert.equal(s.on, true);
  assert.equal(s.card, IMG);
  assert.equal(s.pages.length, 3);
  assert.equal(s.y, 0.95);
  assert.equal(s.nameSize, 36);
  assert.equal(s.orgSize, 30);
  assert.equal(cleanInvitation({ card: "javascript:x" }).card, "");
});

test("isInvitation needs it on and a card", () => {
  assert.equal(isInvitation({ on: true, card: IMG }), true);
  assert.equal(isInvitation({ on: true }), false);
  assert.equal(isInvitation({ on: false, card: IMG }), false);
  assert.equal(isInvitation(null), false);
});

test("cardNames: contact person over the company, else the name alone", () => {
  assert.deepEqual(cardNames({ name: "Pawssion Project Foundation Inc", contact: "Ms. Malou Perez" }), { name: "Ms. Malou Perez", org: "Pawssion Project Foundation Inc" });
  assert.deepEqual(cardNames({ name: "Juan  dela Cruz", contact: "" }), { name: "Juan dela Cruz", org: "" });
});

test("cardNames: typed names win; an org typed empty drops the line", () => {
  const r = { name: "Acme", contact: "Ana Reyes" };
  assert.deepEqual(cardNames(r, { name: "Ms. Ana Reyes" }), { name: "Ms. Ana Reyes", org: "Acme" });
  assert.deepEqual(cardNames(r, { name: "", org: "" }), { name: "Ana Reyes", org: "" });
  assert.deepEqual(cardNames(r, { name: "Hon. Ana", org: "Senate" }), { name: "Hon. Ana", org: "Senate" });
});

test("readCardNames keeps only refs in this send", () => {
  const { byRef } = readCardNames(JSON.stringify({ "contact:a": { name: "A", org: "B" }, "contact:z": { name: "Z" } }), ["contact:a"]);
  assert.deepEqual(byRef, { "contact:a": { name: "A", org: "B" } });
  assert.deepEqual(readCardNames("not json", ["x"]).byRef, {});
});

test("cardLayout puts the org line under the name only when there is one", () => {
  const withOrg = cardLayout({ y: 0.8, nameSize: 72, orgSize: 28 }, { org: "Acme" });
  assert.equal(withOrg.nameBaseline, 1080);
  assert.ok(withOrg.orgBaseline > withOrg.nameBaseline);
  assert.equal(cardLayout({ y: 0.8 }, { org: "" }).orgBaseline, null);
});
