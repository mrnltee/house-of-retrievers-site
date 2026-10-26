import test from "node:test";
import assert from "node:assert/strict";
import { autoMatch, cellText, mapRows, rowInput } from "./sheetImport.mjs";

test("columns match by name, exact names first, each column once", () => {
  const m = autoMatch(["Company", "Contact Person", "Email Address", "Mobile", "Status", "Notes"], "supporters");
  assert.deepEqual(m, { name: 0, contactName: 1, contactEmail: 2, contactPhone: 3, status: 4, notes: 5 });
  const r = autoMatch(["Full Name", "E-mail", "Dog Name", "No. of Dogs", "Payment Status", "Ref"], "registrations");
  assert.equal(r.name, 0);
  assert.equal(r.email, 1);
  assert.equal(r.furbabyName, 2);
  assert.equal(r.payment, 4);
  assert.equal(r.reference, 5);
});

test("rows: header skipped, blank rows dropped, cells as text", () => {
  const rows = [["Name", "When"], ["Ana", new Date("2026-10-11T00:00:00Z")], ["", ""], ["Ben", 3.0]];
  assert.deepEqual(mapRows(rows, { name: 0, date: 1 }), [{ line: 2, fields: { name: "Ana", date: "2026-10-11" } }, { line: 4, fields: { name: "Ben", date: "3" } }]);
  assert.equal(cellText(true), "yes");
});

test("supporters: labels accepted, unknown values explained", () => {
  const ok = rowInput("supporters", { name: "Pawsome", status: "Confirmed", tier: "Gold", gives: "Cash, In-kind", cashAmount: "₱15,000" });
  assert.match(ok.error || "", /Tier "Gold"/);
  const good = rowInput("supporters", { name: "Pawsome", status: "confirmed", gives: "Cash, In-kind", cashAmount: "₱15,000" });
  assert.equal(good.input.kind, "Sponsor");
  assert.deepEqual(good.input.gives, ["cash", "in-kind"]);
  assert.equal(good.input.cashAmount, "15000");
  assert.match(rowInput("supporters", { name: "X", kind: "Donor" }).error, /Sponsor or Partner/);
});

test("registrations: ticket by name, payment words, yes/no", () => {
  const tickets = [{ label: "Early Bird", amount: 500 }, { label: "Regular", amount: 750 }];
  const r = rowInput("registrations", { name: "Ana", email: "a@x.ph", ticket: "regular", payment: "Paid", method: "Bank Transfer", photoConsent: "Yes" }, { tickets });
  assert.equal(r.input.ticket, "1");
  assert.equal(r.input.payment, "paid");
  assert.equal(r.input.method, "bank");
  assert.equal(r.input.photoConsent, "yes");
  assert.match(rowInput("registrations", { name: "A", email: "a@x.ph", ticket: "VIP" }, { tickets }).error, /isn't one of this event's/);
  assert.match(rowInput("registrations", { name: "A", email: "a@x.ph", payment: "maybe" }).error, /Paid, Pending/);
  assert.equal(rowInput("registrations", { name: "A", email: "a@x.ph" }).input.photoConsent, "no");
});

test("people: join type and status checked", () => {
  assert.equal(rowInput("people", { name: "Ana", email: "ANA@x.ph", kind: "volunteer" }).input.email, "ana@x.ph");
  assert.match(rowInput("people", { name: "Ana", email: "a@x.ph", kind: "Fan" }).error, /Join type/);
  assert.match(rowInput("people", { name: "Ana", email: "nope", kind: "Member" }).error, /email/);
});
