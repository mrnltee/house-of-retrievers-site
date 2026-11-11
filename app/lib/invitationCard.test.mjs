import test from "node:test";
import assert from "node:assert/strict";
import { cardLayout, cardNames, cleanInvitation, isInvitation, participantInvitation, readCardNames } from "./invitationCard.mjs";

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

test("withCardName greets the name typed for the card", async () => {
  const { withCardName } = await import("./invitationCard.mjs");
  const r = { name: "Acme", contact: "Ana", salutation: "Ms. Ana" };
  assert.deepEqual(withCardName(r, { name: " Hon.  Ana Reyes " }), { name: "Acme", contact: "Hon. Ana Reyes", salutation: "Hon. Ana Reyes" });
  assert.equal(withCardName(r, { name: "" }), r);
  assert.equal(withCardName(r, null), r);
});

test("furbabyCardLine lists a participant's furbabies", async () => {
  const { furbabyCardLine } = await import("./invitationCard.mjs");
  assert.equal(furbabyCardLine("Mochi"), "& Mochi");
  assert.equal(furbabyCardLine("Mochi, Fudge"), "& Mochi and Fudge");
  assert.equal(furbabyCardLine("Mochi, Fudge and Bean"), "& Mochi, Fudge and Bean");
  assert.equal(furbabyCardLine(""), "");
  assert.equal(furbabyCardLine(null), "");
});

test("cardNames uses a participant's own card line", () => {
  assert.deepEqual(cardNames({ name: "Alyzza Bayaban", contact: "", cardLine: "& Mochi" }), { name: "Alyzza Bayaban", org: "& Mochi" });
  assert.deepEqual(cardNames({ name: "Ana", contact: "", cardLine: "" }), { name: "Ana", org: "" });
});

test("invitation audience: guests by default, participants only when asked", () => {
  assert.equal(cleanInvitation({}).audience, "guests");
  assert.equal(cleanInvitation({ audience: "participants" }).audience, "participants");
  assert.equal(cleanInvitation({ audience: "everyone" }).audience, "guests");
});

test("participantInvitation picks the participants' card, else any invitation", () => {
  const card = "/api/event-image/00000000-0000-0000-0000-000000000001";
  const guests = { key: "g", invitation: { on: true, card, audience: "guests" } };
  const people = { key: "p", invitation: { on: true, card, audience: "participants" } };
  const off = { key: "o", invitation: { on: false, card, audience: "participants" } };
  assert.equal(participantInvitation([guests, people]).key, "p");
  assert.equal(participantInvitation([off, guests]).key, "g");
  assert.equal(participantInvitation([{ key: "x" }]), null);
});

test("invitation QR: off by default, clamped, kept on the page", async () => {
  const { cleanQr, qrBox } = await import("./invitationCard.mjs");
  assert.deepEqual(cleanInvitation({}).qr, { on: false, x: 0.5, y: 0.78, size: 0.26 });
  assert.deepEqual(cleanQr({ on: "1", x: 2, y: -1, size: 0.9 }), { on: true, x: 0.9, y: 0.1, size: 0.5 });
  const box = qrBox({ qr: { on: true, x: 0.9, y: 0.9, size: 0.5 } });
  assert.equal(box.px, 540);
  assert.equal(box.left, 1080 - 540);
  assert.equal(box.top, 1350 - 540);
  assert.deepEqual(qrBox({ qr: { x: 0.5, y: 0.5, size: 0.2 } }), { left: 432, top: 567, px: 216 });
});
