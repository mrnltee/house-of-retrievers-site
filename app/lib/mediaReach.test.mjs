import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_COMMUNITY, DEFAULT_PACK, MAX_RATES, PACK_FAMILIES, STALE_AFTER_DAYS, cleanCommunity, cleanContact, cleanCount, cleanPack, cleanRates, communityLine, daysSince, formatCount, manilaDate, reachFrom, staleCounts, withLiveInstagram } from "./mediaReach.mjs";
import { pressKitFrom } from "./mediaPressKit.mjs";

test("counts are kept only as people write them", () => {
  for (const ok of ["1,408", "2.5K", "165k", "1.2M", "280"]) assert.equal(cleanCount(ok), ok);
  for (const bad of ["", "lots", "1,408 followers", "1 000", "-5"]) assert.equal(cleanCount(bad), "");
});

test("channels need a name and a count, links must be https", () => {
  const community = cleanCommunity(JSON.stringify({ asOf: " 16 November 2026 ", channels: [
    { name: "Instagram", handle: "@hor", url: "javascript:alert(1)", followers: "1,408", posts: "280" },
    { name: "TikTok", followers: "" },
    { name: "Facebook", url: "https://www.facebook.com/houseofretrieversph", followers: "2.5K" },
  ] }));
  assert.equal(community.asOf, "16 November 2026");
  assert.deepEqual(community.channels.map((row) => [row.name, row.url]), [["Instagram", ""], ["Facebook", "https://www.facebook.com/houseofretrieversph"]]);
  assert.deepEqual(cleanCommunity("nope"), { asOf: "", channels: [] });
});

test("every default pack row matches a founding family", () => {
  const handles = PACK_FAMILIES.map((family) => family.handle);
  assert.equal(PACK_FAMILIES.length, 5);
  for (const row of DEFAULT_PACK) assert.ok(handles.includes(row.handle), row.handle);
  // Owner, 16 Nov 2026: every family's counts are shown, counts only.
  assert.ok(DEFAULT_PACK.every((row) => row.statsOn && row.followers && row.asOf), "each family has dated counts");
  assert.ok(DEFAULT_PACK.every((row) => row.rates.length === 0), "no rates are prefilled");
});

test("a family's numbers show only when switched on with a count and a date", () => {
  assert.deepEqual(reachFrom({}).pack.map((family) => [family.handle, family.stats.followers, family.stats.posts, family.stats.rates.length]), [
    ["@thegolden.nuggets", "1,778", "965", 0], ["@dailydoseofmacchiato_", "1,456", "223", 0], ["@itsmefayethepancakee", "2,103", "535", 0],
    ["@lukaxluji_goldenbros", "1,025", "117", 0], ["@molly.maverickthebears", "1,368", "1,102", 0],
  ]);
  // A family switched off in the admin goes back to "available on request".
  assert.equal(reachFrom({ pack: [{ handle: "@thegolden.nuggets", statsOn: false, followers: "1,778", asOf: "16 November 2026" }] }).pack[0].stats, null);
  const on = reachFrom({ pack: [{ handle: "@thegolden.nuggets", show: true, statsOn: true, followers: "1,778", posts: "965", asOf: "16 November 2026" }] });
  assert.deepEqual(on.pack.find((family) => family.handle === "@thegolden.nuggets").stats, { followers: "1,778", posts: "965", asOf: "16 November 2026", rates: [], contact: "" });
  const undated = reachFrom({ pack: [{ handle: "@thegolden.nuggets", statsOn: true, followers: "1,778", asOf: "" }] });
  assert.equal(undated.pack.find((family) => family.handle === "@thegolden.nuggets").stats, null);
  const hidden = reachFrom({ pack: [{ handle: "@thegolden.nuggets", show: false }] });
  assert.equal(hidden.pack.length, 4);
  assert.deepEqual(cleanPack([{ handle: "@someone.else", show: true }]), []);
});

test("saved channels win; content from before this uses the defaults", () => {
  assert.deepEqual(reachFrom({}).community, DEFAULT_COMMUNITY);
  assert.deepEqual(reachFrom({ community: { asOf: "", channels: [] } }).community, DEFAULT_COMMUNITY);
  assert.equal(reachFrom({ community: { asOf: "1 Dec 2026", channels: [{ name: "Instagram", followers: "1.5K" }] } }).community.channels.length, 1);
});

test("the fact sheet gets one dated audience line, never a total", () => {
  assert.equal(communityLine(DEFAULT_COMMUNITY), "Instagram 1,408 followers · Facebook 2.5K followers (as of 16 November 2026)");
  const rows = pressKitFrom({}).factSheet;
  assert.deepEqual(rows.at(-1), ["Online audience", communityLine(DEFAULT_COMMUNITY)]);
  const own = pressKitFrom({ factSheet: "Legal name: HoR\nOnline audience: our own words" }).factSheet;
  assert.equal(own.filter(([label]) => label === "Online audience").length, 1);
});

test("rate cards: rates need both parts, contacts are an email or an https link, all hidden without consent", () => {
  assert.deepEqual(cleanRates([{ label: "Feed post", amount: "₱5,000" }, { label: "Reel", amount: "" }, { label: "<b>Story</b>", amount: "On request" }]), [{ label: "Feed post", amount: "₱5,000" }, { label: "Story", amount: "On request" }]);
  assert.equal(cleanRates(Array.from({ length: 10 }, () => ({ label: "a", amount: "b" }))).length, MAX_RATES);
  assert.equal(cleanContact("mollythebear.collab@gmail.com"), "mollythebear.collab@gmail.com");
  assert.equal(cleanContact("https://linktr.ee/molly"), "https://linktr.ee/molly");
  assert.equal(cleanContact("javascript:alert(1)"), "");
  const row = { handle: "@molly.maverickthebears", statsOn: false, followers: "1,368", asOf: "16 November 2026", rates: [{ label: "Feed post", amount: "₱5,000" }], contact: "a@b.co" };
  assert.equal(reachFrom({ pack: [row] }).pack.find((f) => f.handle === row.handle).stats, null);
  const shown = reachFrom({ pack: [{ ...row, statsOn: true, followers: "" }] }).pack.find((f) => f.handle === row.handle).stats;
  assert.deepEqual(shown.rates, [{ label: "Feed post", amount: "₱5,000" }]);
  assert.equal(shown.contact, "a@b.co");
});

const NOW = new Date("2026-11-20T04:00:00Z");
const LIVE = { username: "houseofretrieversph", followers: 1412, posts: 281 };

test("live Instagram counts go on HoR's own Instagram tile only, dated today in Manila", () => {
  const community = withLiveInstagram(DEFAULT_COMMUNITY, LIVE, NOW);
  assert.deepEqual(community.channels[0], { ...DEFAULT_COMMUNITY.channels[0], followers: "1,412", posts: "281", live: true, asOf: "20 November 2026" });
  assert.deepEqual(community.channels[1], DEFAULT_COMMUNITY.channels[1], "Facebook keeps its typed numbers");
  assert.equal(withLiveInstagram(DEFAULT_COMMUNITY, null, NOW), DEFAULT_COMMUNITY, "no live counts: unchanged");
  assert.equal(withLiveInstagram(DEFAULT_COMMUNITY, { ...LIVE, username: "someoneelse" }, NOW), DEFAULT_COMMUNITY, "another account never overwrites ours");
  assert.equal(formatCount(1408), "1,408");
  assert.equal(manilaDate(new Date("2026-11-16T20:00:00Z")), "17 November 2026", "Manila is UTC+8");
});

test("the fact sheet line dates each channel when the dates differ, and never adds them up", () => {
  const line = communityLine(withLiveInstagram(DEFAULT_COMMUNITY, LIVE, NOW));
  assert.equal(line, "Instagram 1,412 followers (as of 20 November 2026) · Facebook 2.5K followers (as of 16 November 2026)");
  assert.equal(communityLine(DEFAULT_COMMUNITY), "Instagram 1,408 followers · Facebook 2.5K followers (as of 16 November 2026)");
});

test("monthly reminder: typed counts over a month old, never the live tile", () => {
  assert.equal(daysSince("16 November 2026", NOW), 4);
  assert.equal(daysSince("someday", NOW), null);
  assert.deepEqual(staleCounts({}, { now: NOW }), []);
  const later = new Date("2026-12-20T04:00:00Z");
  assert.ok(daysSince("16 November 2026", later) > STALE_AFTER_DAYS);
  const all = staleCounts({}, { now: later }).map((row) => row.what);
  assert.ok(all.includes("Instagram (HoR)") && all.includes("Facebook (HoR)") && all.length === 7, all.join(", "));
  const withLive = staleCounts({}, { now: later, instagram: LIVE }).map((row) => row.what);
  assert.ok(!withLive.includes("Instagram (HoR)") && withLive.includes("Facebook (HoR)"));
  const off = staleCounts({ pack: [{ handle: "@thegolden.nuggets", statsOn: false, asOf: "1 January 2026" }] }, { now: later }).map((row) => row.what);
  assert.ok(!off.some((what) => what.includes("@thegolden.nuggets")), "families switched off are not nagged about");
});
