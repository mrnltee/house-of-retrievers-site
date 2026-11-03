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

test("if the trackers can't be read, an event shows no brand names rather than unchecked ones", async () => {
  const { withoutBrands } = await import("./eventBrands.mjs");
  assert.deepEqual(withoutBrands({ id: "e1", title: "T", partners: ["Novotel"], sponsors: ["GRWM"] }), { id: "e1", title: "T", partners: [], sponsors: [] });
});

test("tracker sort: names both ways, sent newest/oldest with unsent last, reply", async () => {
  const { sortTracker, trackerSort } = await import("./eventBrands.mjs");
  const rows = [
    { name: "bravo", reply: "no" },
    { name: "Alpha", reply: "waiting" },
    { name: "Charlie", reply: "yes" },
    { name: "Delta", reply: "waiting" },
  ];
  const sent = { bravo: "2026-11-02T10:00:00Z", Alpha: "2026-11-03T09:00:00Z", Charlie: null, Delta: "2026-11-01T08:00:00Z" };
  const at = (r) => sent[r.name];
  const names = (sort) => sortTracker(rows, sort, at).map((r) => r.name).join(",");
  assert.equal(names("name"), "Alpha,bravo,Charlie,Delta");
  assert.equal(names("name-desc"), "Delta,Charlie,bravo,Alpha");
  assert.equal(names("sent-new"), "Alpha,bravo,Delta,Charlie");
  assert.equal(names("sent-old"), "Delta,bravo,Alpha,Charlie");
  assert.equal(names("reply"), "Charlie,Alpha,Delta,bravo");
  assert.equal(trackerSort("nonsense"), "name");
  assert.equal(names("nonsense"), "Alpha,bravo,Charlie,Delta");
});
