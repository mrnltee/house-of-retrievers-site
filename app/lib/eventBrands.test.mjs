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

test("events a brand can be added to: upcoming soonest first, past newest first", async () => {
  const { eventChoiceGroups } = await import("./eventBrands.mjs");
  const events = [
    { id: "a", date: "2026-10-01" }, { id: "b", date: "2026-12-05" }, { id: "c", date: "2026-11-14" }, { id: "d", date: "2026-08-20" }, { id: "e", date: "2026-11-20" },
  ];
  const { upcoming, past } = eventChoiceGroups(events, "2026-11-14");
  assert.deepEqual(upcoming.map((e) => e.id), ["c", "e", "b"]);
  assert.deepEqual(past.map((e) => e.id), ["a", "d"]);
  assert.deepEqual(eventChoiceGroups([], "2026-11-14"), { upcoming: [], past: [] });
});

test("event picks: only ids, no repeats, a known reply", async () => {
  const { cleanEventPicks, MAX_EVENT_PICKS } = await import("./eventBrands.mjs");
  const id = "0b6c5c4e-1d2f-4a3b-9c8d-7e6f5a4b3c2d";
  assert.deepEqual(cleanEventPicks([id, id, "nope", 5], "yes"), { ids: [id], reply: "yes" });
  assert.equal(cleanEventPicks([id], "maybe").reply, "waiting");
  assert.deepEqual(cleanEventPicks(undefined).ids, []);
  const many = Array.from({ length: 30 }, (_, i) => `0b6c5c4e-1d2f-4a3b-9c8d-${String(i).padStart(12, "0")}`);
  assert.equal(cleanEventPicks(many).ids.length, MAX_EVENT_PICKS);
});

test("follow up: only brands with no reply yet, with the follow-up email and the event", async () => {
  const { followUpLink } = await import("./eventBrands.mjs");
  const rows = [
    { supporter_id: "a", reply: "waiting", contact_email: "a@x.ph" }, { supporter_id: "b", reply: "yes", contact_email: "b@x.ph" },
    { supporter_id: "c", reply: "waiting", contact_email: null }, { supporter_id: "d", reply: "no", contact_email: "d@x.ph" },
  ];
  const link = followUpLink("/admin", "ev1", rows);
  assert.equal(link.href, "/admin/letters/send?letter=brand-follow-up&event=ev1&list=brands&to=supporter%3Aa&to=supporter%3Ac");
  assert.equal(link.count, 2);
  assert.equal(link.noEmail, 1);
  assert.deepEqual(followUpLink("", "ev1", [rows[1]]), { href: "", count: 0, noEmail: 0 });
});

test("row letter links: Send letter for every brand, Follow up only once an invite went out and they haven't replied", async () => {
  const { rowLetterLinks } = await import("./eventBrands.mjs");
  const waiting = { supporter_id: "a", reply: "waiting", contact_email: "a@x.ph" };
  const sent = rowLetterLinks("/admin", "ev1", waiting, "ev-letter", { sent: true });
  assert.equal(sent.send, "/admin/letters/send?letter=ev-letter&event=ev1&list=brands&to=supporter%3Aa");
  assert.equal(sent.followUp, "/admin/letters/send?letter=brand-follow-up&event=ev1&list=brands&to=supporter%3Aa");
  assert.equal(rowLetterLinks("/admin", "ev1", waiting, "ev-letter", { sent: false }).followUp, "", "nothing to follow up before the invite is sent");
  assert.equal(rowLetterLinks("/admin", "ev1", { ...waiting, reply: "yes" }, "ev-letter", { sent: true }).followUp, "", "they replied");
  // No email on record: still offered, the send window has "Send to another email".
  assert.match(rowLetterLinks("/admin", "ev1", { ...waiting, contact_email: null }, "ev-letter", { sent: true }).send, /to=supporter%3Aa$/);
});

test("partner classification: co-presenter, in-kind partner, exhibitor", async () => {
  const { readRole, roleChoice, roleLabel, cleanEventBrand, partnerGroups } = await import("./eventBrands.mjs");
  assert.deepEqual(readRole("Partner:exhibitor"), { role: "Partner", partnerType: "exhibitor" });
  assert.deepEqual(readRole("Partner"), { role: "Partner", partnerType: null });
  assert.deepEqual(readRole("Sponsor:exhibitor"), { role: "Sponsor", partnerType: null });
  assert.deepEqual(readRole("Partner:boss"), { role: "Partner", partnerType: null });
  assert.equal(readRole("Boss").role, null);
  assert.equal(cleanEventBrand({ role: "Partner:co-presenter" }).value.partnerType, "co-presenter");
  assert.equal(cleanEventBrand({ role: "Sponsor" }).value.partnerType, null);
  assert.equal(roleChoice({ role: "Partner", partner_type: "in-kind" }), "Partner:in-kind");
  assert.equal(roleChoice({ role: "Sponsor", partner_type: "in-kind" }), "Sponsor");
  assert.equal(roleLabel({ role: "Partner", partner_type: "exhibitor" }), "Exhibitor");
  assert.equal(roleLabel({ role: "Partner" }), "Partner");
  const groups = partnerGroups(["Arf Co", "Pet Mart", "Typed Name", "Booth Ltd"], { "arf co": "co-presenter", "pet mart": "in-kind", "booth ltd": "exhibitor" });
  assert.deepEqual(groups.map((g) => [g.title, g.names]), [
    ["Co-presented with", ["Arf Co"]], ["In partnership with", ["Typed Name"]], ["In-kind partners", ["Pet Mart"]], ["Exhibitors", ["Booth Ltd"]],
  ]);
  assert.deepEqual(partnerGroups(["A"]).map((g) => g.title), ["In partnership with"]);
});

test("the Guest tracker can sort by group, then name; the Brand tracker can't", async () => {
  const { sortTracker, trackerSort, GUEST_SORTS } = await import("./eventBrands.mjs");
  const order = ["speaker", "organizer", "vip"];
  const rows = [{ name: "Zed", category: "vip" }, { name: "Ana", category: "organizer" }, { name: "Bo", category: "speaker" }, { name: "Al", category: "speaker" }];
  const groupRank = (r) => order.indexOf(r.category);
  assert.equal(sortTracker(rows, "group", () => null, { groupRank }).map((r) => r.name).join(","), "Al,Bo,Ana,Zed");
  assert.equal(trackerSort("group", GUEST_SORTS), "group");
  assert.equal(trackerSort("group"), "name");
});

import { brandGroupKeys, brandGroups } from "./eventBrands.mjs";

test("brand tracker groups: partners with their categories, then sponsors", () => {
  assert.deepEqual(brandGroupKeys({ role: "Partner", partner_type: "exhibitor" }), ["partner", "partner:exhibitor"]);
  assert.deepEqual(brandGroupKeys({ role: "Partner", partner_type: null }), ["partner", "partner:none"]);
  assert.deepEqual(brandGroupKeys({ role: "Sponsor", partner_type: "exhibitor" }), ["sponsor"]);
  const rows = [{ role: "Partner", partner_type: "exhibitor" }, { role: "Partner" }, { role: "Partner", partner_type: "exhibitor" }, { role: "Sponsor" }];
  assert.deepEqual(brandGroups(rows), [
    ["partner", "Partners", 3],
    ["partner:exhibitor", "Partners · Exhibitor", 2],
    ["partner:none", "Partners · no category yet", 1],
    ["sponsor", "Sponsors", 1],
  ]);
  // Every partner unclassified: no line repeating the total.
  assert.deepEqual(brandGroups([{ role: "Partner" }, { role: "Sponsor" }]), [["partner", "Partners", 1], ["sponsor", "Sponsors", 1]]);
});
