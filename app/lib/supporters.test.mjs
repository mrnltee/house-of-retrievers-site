import test from "node:test";
import assert from "node:assert/strict";
import { byTier, gaveLine, isPublic, publicSupporter, suggestCode, supporterNumber, supporterSlug, totals, validateSupporter } from "./supporters.mjs";

test("the form is cleaned; the website switch needs confirmed + logo + blurb", () => {
  const { value, notes } = validateSupporter({ kind: "Sponsor", name: "  Sponsor  A ", status: "talking", showOnSite: "on", website: "sponsor-a.example", instagram: "https://instagram.com/sponsor.a", cashAmount: "₱15,000", gives: ["cash", "nope"] });
  assert.equal(value.name, "Sponsor A");
  assert.equal(value.website, "https://sponsor-a.example/");
  assert.equal(value.instagram, "sponsor.a");
  assert.equal(value.cashAmount, 15000);
  assert.deepEqual(value.gives, ["cash"]);
  assert.equal(value.showOnSite, false);
  assert.match(notes[0], /Confirmed status, a logo, a blurb/);
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
  assert.equal(isPublic(row), true);
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
