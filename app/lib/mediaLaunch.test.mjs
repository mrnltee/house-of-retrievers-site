import { test } from "node:test";
import assert from "node:assert/strict";
import { launchOverview, initialsOf, LAUNCH_TIME } from "./mediaLaunch.mjs";

test("launch overview reads the live event: date with the public time, venue, beneficiaries, guests", () => {
  const o = launchOverview({
    date: "2026-11-30", startTime: "14:30", venue: "Novotel Manila Araneta City", venueAddress: "General Aguinaldo Avenue, Quezon City",
    beneficiaries: [{ name: "Pawssion Project Foundation Inc." }, { name: "Little Sisters" }],
    speakers: [{ id: "a", name: "Eric Suguitan", role: "Guest speaker", label: "VIP", photo: "/api/event-image/x", intro: "long" }],
    partners: ["Bluehive"], sponsors: ["Boop"], supporterLinks: { boop: { slug: "boop", logo: "/api/event-image/b" } },
  });
  assert.deepEqual(o.facts, [
    ["When", `Monday, 30 November 2026 · ${LAUNCH_TIME}`],
    ["Where", "Novotel Manila Araneta City, General Aguinaldo Avenue, Quezon City"],
    ["For", "Pawssion Project Foundation Inc. and Little Sisters"],
  ]);
  assert.deepEqual(o.guests, [{ id: "a", name: "Eric Suguitan", role: "Guest speaker", label: "VIP", photo: "/api/event-image/x" }]);
  assert.deepEqual(o.partners, [{ name: "Bluehive", logo: null, slug: null }]);
  assert.deepEqual(o.sponsors, [{ name: "Boop", logo: "/api/event-image/b", slug: "boop" }]);
});

test("without the event: the built-in facts, no guests", () => {
  const o = launchOverview(null);
  assert.equal(o.facts[0][1], `Monday, 30 November 2026 · ${LAUNCH_TIME}`);
  assert.equal(o.facts[1][1], "Novotel Manila Araneta City, Quezon City");
  assert.match(o.facts[2][1], /Pawssion/);
  assert.deepEqual(o.guests, []);
});

test("initials", () => {
  assert.equal(initialsOf("Mally the Kariton Dog"), "MT");
  assert.equal(initialsOf("Ms. Malou Perez"), "MM");
  assert.equal(initialsOf(""), "•");
});

test("launch brands are grouped like the event page", () => {
  const o = launchOverview({ date: "2026-11-30", partners: ["Bork", "Boop"], partnerTypes: { boop: "in-kind" }, sponsors: ["Kaori"] });
  assert.deepEqual(o.brandGroups.map(([t, l]) => [t, l.map((b) => b.name)]), [["In partnership with", ["Bork"]], ["In-kind partners", ["Boop"]], ["Sponsored by", ["Kaori"]]]);
});
