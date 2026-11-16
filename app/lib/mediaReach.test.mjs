import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_COMMUNITY, DEFAULT_PACK, PACK_FAMILIES, cleanCommunity, cleanCount, cleanPack, communityLine, reachFrom } from "./mediaReach.mjs";
import { pressKitFrom } from "./mediaPressKit.mjs";

test("counts are kept only as people write them", () => {
  for (const ok of ["1,408", "2.5K", "165k", "1.2M", "280"]) assert.equal(cleanCount(ok), ok);
  for (const bad of ["", "lots", "1,408 followers", "<b>1</b>", "-5"]) assert.equal(cleanCount(bad), "");
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
  assert.ok(DEFAULT_PACK.every((row) => row.statsOn === false), "numbers stay hidden until a family agrees");
});

test("a family's numbers show only when switched on with a count and a date", () => {
  assert.ok(reachFrom({}).pack.every((family) => family.stats === null));
  const on = reachFrom({ pack: [{ handle: "@thegolden.nuggets", show: true, statsOn: true, followers: "1,778", posts: "965", asOf: "16 November 2026" }] });
  assert.deepEqual(on.pack.find((family) => family.handle === "@thegolden.nuggets").stats, { followers: "1,778", posts: "965", asOf: "16 November 2026" });
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
