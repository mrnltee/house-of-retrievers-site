import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEventBrand, publicNames, replyLabel, trackerCounts, trackerReply } from "./eventBrands.mjs";

test("a tracker row is checked: role, amounts, head counts, follow-up date", () => {
  const { value } = cleanEventBrand({ role: "Sponsor", reply: "yes", cashAmount: "1,500", gives: ["cash", "nope"], showAmounts: "on" });
  assert.equal(value.role, "Sponsor");
  assert.equal(value.reply, "yes");
  assert.equal(value.cashAmount, 1500);
  assert.deepEqual(value.gives, ["cash"]);
  assert.equal(value.showAmounts, true);
  assert.equal(value.followUpOn, null);
  assert.match(cleanEventBrand({ role: "x" }).error, /Partner or Sponsor/);
  assert.match(cleanEventBrand({ role: "Partner", repsAttending: "2.5" }).error, /whole numbers/);
  assert.match(cleanEventBrand({ role: "Partner", followUpOn: "31/12" }).error, /date/);
  assert.equal(cleanEventBrand({ role: "Partner", reply: "maybe" }).value.reply, "waiting");
  assert.equal(replyLabel("waiting"), "No reply yet");
});

test("Brand Tracker RSVP becomes the event reply", () => {
  assert.equal(trackerReply("confirmed"), "yes");
  assert.equal(trackerReply("declined"), "no");
  assert.equal(trackerReply("tentative"), "waiting");
  assert.equal(trackerReply(null), "waiting");
});

test("tracker counts", () => {
  assert.deepEqual(trackerCounts([{ reply: "yes" }, { reply: "no" }, { reply: "waiting" }, { reply: "yes" }]), { invited: 4, yes: 2, no: 1, waiting: 1 });
});

test("public names: Yes brands, then hand-typed names not in the directory", () => {
  assert.deepEqual(publicNames(["Novotel ", "Kuya's Cafe"], ["Vitality"], ["novotel", "vitality"]), ["Vitality", "Kuya's Cafe"]);
  assert.deepEqual(publicNames(["vitality"], ["Vitality"], []), ["Vitality"]);
});
