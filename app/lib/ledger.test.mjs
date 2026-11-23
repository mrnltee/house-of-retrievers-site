import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEntry, ledgerLines, ledgerTotals, needsProof, readPesos, transparencyReport, EXPENSE_CATEGORIES, CATEGORIES } from "./ledger.mjs";

const EV = "11111111-1111-4111-8111-111111111111";
const BEN = "55555555-5555-4555-8555-555555555555";

test("an expense line is cleaned: whole pesos, a category, a description", () => {
  const { entry } = cleanEntry({ kind: "expense", date: "2026-11-03", category: "venue", description: " Venue  deposit ", party: "Novotel", amount: "₱12,000.00", method: "bank", reference: "A1", event: EV });
  assert.deepEqual(entry, { kind: "expense", eventId: EV, date: "2026-11-03", category: "venue", description: "Venue deposit", party: "Novotel", beneficiaryId: null, amount: 12000, quantity: null, method: "bank", reference: "A1", showName: true, notes: null });
});

test("lines are refused without what the report needs", () => {
  assert.match(cleanEntry({}).error, /kind/);
  assert.match(cleanEntry({ kind: "expense", date: "3 Nov" }).error, /date/);
  assert.match(cleanEntry({ kind: "expense", date: "2026-11-03", category: "nope" }).error, /category/);
  assert.match(cleanEntry({ kind: "expense", date: "2026-11-03", category: "venue", description: "x", amount: "" }).error, /amount/);
  assert.match(cleanEntry({ kind: "expense", date: "2026-11-03", category: "venue", description: "x", amount: "10.50" }).error, /whole pesos/);
  assert.match(cleanEntry({ kind: "turnover", date: "2026-12-02", category: "cash", description: "x", amount: "100" }).error, /beneficiary/);
});

test("in-kind may have no value yet, keeps a quantity, and the giver can stay unnamed", () => {
  const { entry } = cleanEntry({ kind: "in_kind", date: "2026-11-20", category: "food", description: "Dog treats", party: "Ana", quantity: "20 packs", amount: "" });
  assert.equal(entry.amount, null);
  assert.equal(entry.quantity, "20 packs");
  assert.equal(entry.showName, false);
  assert.equal(entry.method, null);
  assert.equal(cleanEntry({ kind: "in_kind", date: "2026-11-20", category: "food", description: "x", showName: "on" }).entry.showName, true);
});

test("a turnover to a listed beneficiary; goods have no payment method", () => {
  const { entry } = cleanEntry({ kind: "turnover", date: "2026-12-02", category: "goods", description: "Food and blankets", amount: "8000", beneficiary: BEN, method: "cash" });
  assert.equal(entry.beneficiaryId, BEN);
  assert.equal(entry.method, null);
  assert.ok(needsProof("expense") && needsProof("turnover") && !needsProof("in_kind") && !needsProof("income"));
});

test("pesos", () => {
  assert.deepEqual(readPesos("₱2,450"), { amount: 2450 });
  assert.deepEqual(readPesos(""), { amount: null });
  assert.match(readPesos("abc").error, /pesos/);
});

const sources = {
  entries: [
    { id: "e1", kind: "expense", event_id: EV, entry_date: "2026-11-03", category: "venue", description: "Venue deposit", party: "Novotel", amount: 12000, files: 1 },
    { id: "e2", kind: "expense", event_id: EV, entry_date: "2026-11-25", category: "printing", description: "Tarpaulin", party: "PrintCo", amount: 1500, files: 0 },
    { id: "e3", kind: "turnover", event_id: EV, entry_date: "2026-12-02", category: "cash", description: "Proceeds", beneficiary_name: "Pawssion Project", amount: 20000, files: 1 },
    { id: "e4", kind: "turnover", event_id: EV, entry_date: "2026-12-02", category: "goods", description: "Food", beneficiary_name: "Little Sisters", amount: 3000, files: 1 },
    { id: "e5", kind: "in_kind", event_id: EV, entry_date: "2026-11-20", category: "food", description: "Dog treats", party: "Ana", quantity: "20 packs", amount: null, show_name: false },
    { id: "e6", kind: "income", event_id: EV, entry_date: "2026-11-30", category: "donation_box", description: "Donation box", party: "", amount: 2300, show_name: true },
  ],
  fees: [{ event_id: EV, date: "2026-11-30", count: 24, amount: 40000, refunded: 750 }],
  donations: [
    { event_id: EV, contact_id: "c1", name: "Jerome", status: "received", amount: 500, acknowledge: "private", verified_at: "2026-11-20", proofs: 1 },
    { event_id: EV, contact_id: "c2", name: "Ana", status: "receipt_sent", amount: 1000, acknowledge: "public", public_name: "Ana D.", proofs: 1 },
    { event_id: EV, contact_id: "c3", name: "Ben", status: "pledged", amount: 2000 },
    { event_id: EV, contact_id: "c4", name: "Cy", status: "declined", amount: 300 },
  ],
  brands: [
    { event_id: EV, supporter_id: "s1", name: "Bluehive", role: "Partner", reply: "yes", cash_amount: 5000, show_amounts: true, date: "2026-11-30" },
    { event_id: EV, supporter_id: "s2", name: "PetCo", role: "Sponsor", reply: "yes", cash_amount: 3000, in_kind_value: 4000, in_kind_note: "Kibble", show_amounts: false, date: "2026-11-30" },
    { event_id: EV, supporter_id: "s3", name: "Nope Inc", role: "Sponsor", reply: "no", cash_amount: 9999 },
  ],
};

test("lines come from every source; declined donations and brands that said no are left out", () => {
  const lines = ledgerLines(sources);
  assert.equal(lines.filter((l) => l.source === "manual").length, 6);
  assert.equal(lines.filter((l) => l.source === "donation").length, 3);
  assert.equal(lines.filter((l) => l.source === "brand").length, 3);
  assert.ok(!lines.some((l) => l.party === "Nope Inc" || l.party === "Cy"));
});

test("totals: cash in, spent, turned over and held; in-kind and pledges are never counted as cash", () => {
  const t = ledgerTotals(ledgerLines(sources));
  assert.equal(t.cashIn, 40000 + 500 + 1000 + 5000 + 3000 + 2300);
  assert.equal(t.spent, 13500);
  assert.equal(t.turnedOver, 20000);
  assert.equal(t.held, t.cashIn - 13500 - 20000);
  assert.equal(t.goodsTurnedOver, 3000);
  assert.equal(t.inKind, 4000);
  assert.equal(t.inKindUnvalued, 1);
  assert.equal(t.pledged, 2000);
  assert.equal(t.donationsToCheck, 1000);
  assert.equal(t.missingProof, 1);
});

test("the report never names a private donor or giver, and shows brand amounts only where agreed", () => {
  const r = transparencyReport(ledgerLines(sources));
  const donations = r.income.find((s) => s.key === "donation");
  assert.equal(donations.amount, 1500);
  assert.match(donations.items[0].label, /Ana D\./);
  assert.doesNotMatch(JSON.stringify(r), /Jerome/);
  const brandCash = r.income.find((s) => s.key === "brand_cash");
  assert.deepEqual(brandCash.items, [{ label: "Bluehive", amount: 5000 }, { label: "PetCo", amount: null }]);
  assert.equal(r.inKind.find((i) => i.label === "Kibble").amount, null);
  assert.equal(r.inKind.find((i) => i.label === "Dog treats").party, "Someone who asked not to be named");
  assert.deepEqual(r.expenses.map((e) => [e.key, e.amount]), [["venue", 12000], ["printing", 1500]]);
  assert.equal(r.turnovers.length, 2);
  assert.deepEqual(r.pledges, { count: 1, amount: 2000 });
  assert.deepEqual(r.income.find((s) => s.key === "fees").items, [{ label: "24 paid registrations, net of ₱750 refunded", amount: null }]);
});

test("one private brand's amount isn't singled out when others are shown", () => {
  const r = transparencyReport(ledgerLines({ brands: [sources.brands[0], { ...sources.brands[1], name: "A" }, { ...sources.brands[1], supporter_id: "s9", name: "B" }] }));
  const items = r.income.find((s) => s.key === "brand_cash").items;
  assert.deepEqual(items, [{ label: "Bluehive", amount: 5000 }, { label: "A, B", amount: 6000 }]);
});

test("every category list has unique keys", () => {
  for (const list of Object.values(CATEGORIES)) assert.equal(new Set(list.map(([k]) => k)).size, list.length);
  assert.ok(EXPENSE_CATEGORIES.some(([k]) => k === "other"));
});

test("an all-events report has a row per event and one for general lines", async () => {
  const { eventBreakdown } = await import("./ledger.mjs");
  const lines = ledgerLines({ entries: [...sources.entries, { id: "g1", kind: "expense", event_id: null, entry_date: "2026-11-01", category: "bank_fees", description: "Bank charge", amount: 50, files: 1 }], fees: sources.fees });
  const rows = eventBreakdown(lines, [{ id: EV, title: "A Golden Beginning", date: "2026-11-30" }]);
  assert.deepEqual(rows.map((r) => [r.title, r.spent]), [["A Golden Beginning", 13500], ["Not tied to an event", 50]]);
});
