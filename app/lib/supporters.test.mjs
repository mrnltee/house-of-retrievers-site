import test from "node:test";
import assert from "node:assert/strict";
import { byTier, gaveLine, isPublic, outreachLine, publicSupporter, suggestCode, supporterNumber, supporterSlug, totals, validateSupporter } from "./supporters.mjs";

test("the form is cleaned; the website switch needs a logo + blurb (any status but Ended)", () => {
  const { value, notes } = validateSupporter({ kind: "Sponsor", name: "  Sponsor  A ", status: "talking", showOnSite: "on", website: "sponsor-a.example", instagram: "https://instagram.com/sponsor.a", cashAmount: "₱15,000", gives: ["cash", "nope"] });
  assert.equal(value.name, "Sponsor A");
  assert.equal(value.website, "https://sponsor-a.example/");
  assert.equal(value.instagram, "sponsor.a");
  assert.equal(value.cashAmount, 15000);
  assert.deepEqual(value.gives, ["cash"]);
  assert.equal(value.showOnSite, false);
  assert.match(notes[0], /needs a logo, a blurb/);
  const ok = validateSupporter({ kind: "Sponsor", name: "S", status: "confirmed", showOnSite: "on", logo: "/api/event-image/abc", blurb: "Hi", code: "nvtl", categoryLabel: " Venue partner " });
  assert.equal(ok.value.code, "NVTL");
  assert.equal(ok.value.categoryLabel, "Venue partner");
  assert.match(validateSupporter({ kind: "Sponsor", name: "S", status: "confirmed" }).error, /4-letter ID code/);
  assert.match(validateSupporter({ kind: "Sponsor", name: "S", code: "AB1" }).error, /4 letters/);
  assert.equal(validateSupporter({ kind: "Sponsor", name: "S", code: "OLD" }, { legacyCode: "OLD" }).value.code, "OLD");
  assert.equal(ok.value.showOnSite, true);
  assert.equal(validateSupporter({ kind: "Partner", name: "P", tier: "pack-leader" }).value.tier, null);
  assert.match(validateSupporter({ kind: "Sponsor", name: "S", cashAmount: "lots" }).error, /pesos/);
  assert.equal(validateSupporter({ kind: "Sponsor", name: "S", logo: "https://evil.example/x.png" }).value.logo, null);
});

test("public view: amounts only once the sponsor was told", () => {
  const row = { slug: "sponsor-a", kind: "Sponsor", name: "Sponsor A", tier: "pack-leader", logo: "/api/event-image/1", blurb: "B", status: "confirmed", show_on_site: true, gives: ["cash", "in-kind"], support_year: 2026, cash_amount: 15000, in_kind_value: 6000, in_kind_note: "treats" };
  assert.equal(isPublic(row, { joined: 1 }), true);
  assert.equal(publicSupporter(row).cash, null);
  const told = publicSupporter({ ...row, amounts_agreed_at: "2026-10-10" });
  assert.equal(told.tierLabel, "Pack Leader");
  assert.equal(gaveLine(told), "Gave ₱15,000 in cash and ₱6,000 in kind (treats) in 2026.");
  assert.equal(gaveLine(publicSupporter(row)), "Gives cash, in-kind: treats.");
  assert.deepEqual(totals([{ ...told, events: [{ slug: "a" }, { slug: "b" }] }], 2026), { year: 2026, cash: 15000, inKind: 6000, events: 2 });
  assert.deepEqual(byTier([told, { ...told, tier: null }]).map((g) => g.name), ["Pack Leader", null]);
  assert.equal(supporterSlug("Pét Pals & Co."), "pet-pals-co");
});

test("ID codes and numbers: HOR-XXXX-YY-NNNN", () => {
  assert.equal(suggestCode("Novotel"), "NVTL");
  assert.equal(suggestCode("Pawsome Pet Shop"), "PPSW");
  assert.equal(suggestCode("The Bark & Brew Café Co."), "BBCR");
  assert.equal(suggestCode("Vetlink"), "VTLN");
  assert.equal(suggestCode("Ana Vet"), "AVNT");
  assert.equal(suggestCode(""), "");
  assert.equal(supporterNumber({ code: "NVTL", number_year: 2026, number_no: 1 }), "HOR-NVTL-26-0001");
  assert.equal(supporterNumber({ code: "NVTL", number_year: null, number_no: null }), "");
});

test("outreach from the Brand Tracker: kept when valid, listed in one line", () => {
  const { value } = validateSupporter({ name: "Boop", kind: "Sponsor", inviteStatus: "sent", rsvpStatus: "maybe", followUpOn: "2026-11-05", repsAttending: "2", assignedTo: " Shey " });
  assert.equal(value.inviteStatus, "sent");
  assert.equal(value.rsvpStatus, null);
  assert.equal(value.repsAttending, 2);
  assert.equal(value.assignedTo, "Shey");
  assert.match(validateSupporter({ name: "Boop", kind: "Sponsor", dogsAttending: "1.5" }).error, /whole numbers/);
  assert.equal(outreachLine({ invite_status: "sent", rsvp_status: "pending", follow_up_on: "2026-11-05" }), "Invite: sent · RSVP: pending · follow up 2026-11-05");
  assert.equal(outreachLine({}), "");
});

test("a brand shows on the website once it said Yes to an event; its status doesn't matter", () => {
  const row = { logo: "/api/event-image/1", blurb: "B", show_on_site: true };
  assert.equal(isPublic(row, { joined: 0 }), false);
  assert.equal(isPublic(row), false);
  for (const status of ["inquiry", "talking", "confirmed", "ended"]) assert.equal(isPublic({ ...row, status }, { joined: 1 }), true);
  assert.equal(isPublic({ ...row, logo: null }, { joined: 2 }), false);
  assert.equal(isPublic({ ...row, show_on_site: false }, { joined: 2 }), false);
});

test("a search with no results becomes the new-brand form's address", async () => {
  const { brandNameFrom, newBrandHref } = await import("./supporters.mjs");
  const ev = "0b6c5c4e-1d2f-4a3b-9c8d-7e6f5a4b3c2d";
  assert.equal(brandNameFrom("  Pawsome   Pet  Co. "), "Pawsome Pet Co.");
  assert.equal(brandNameFrom("x".repeat(100)).length, 80);
  assert.equal(newBrandHref("/admin", { name: " Barkery & Co " }), "/admin/supporters/new?name=Barkery+%26+Co");
  assert.equal(newBrandHref("", { name: "Pawsome", kind: "Partner", event: ev }), `/supporters/new?name=Pawsome&kind=Partner&event=${ev}`);
  assert.equal(newBrandHref("", { name: "", kind: "Nope", event: "x" }), "/supporters/new");
});
