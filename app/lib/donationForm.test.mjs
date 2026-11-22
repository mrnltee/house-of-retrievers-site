import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { donationFromForm, formAmount, formDate, pdfFormFields, sniffFile } from "./donationForm.mjs";
import { checkProblem, donationTotals, sameReferences, DONOR_COLUMNS } from "./eventDonors.mjs";

// Made-up forms shaped like HoR's Cash Donation Form (fillable fields; a viewer appends the answers).
const field = (n, name, value) => `${n} 0 obj\n<< /FT /Tx /T (${name}) /V ${value} >>\nendobj\n`;
const pdf = (...parts) => Buffer.from(`%PDF-1.4\n${parts.join("")}trailer\n<< >>\n%%EOF\n`, "latin1");

const template = [
  field(1, "full_name", "(Someone Else)"),
  field(2, "amount", "()"),
  "3 0 obj\n<< /FT /Btn /T (payment_method) /V /Off >>\nendobj\n",
  "4 0 obj\n<< /FT /Btn /T (acknowledgment) /V /Off >>\nendobj\n",
];
const answers = [
  field(1, "full_name", "(Ana Dela Cruz)"),
  field(2, "amount", "(1,500.00)"),
  "3 0 obj\n<< /FT /Btn /T (payment_method) /V /GCash >>\nendobj\n",
  "4 0 obj\n<< /FT /Btn /T (acknowledgment) /V /Public >>\nendobj\n",
  field(5, "display_name", "<FEFF0041006E0061>"), // "Ana" as UTF-16 hex
  field(6, "payment_date", "(11/05/2026)"),
  field(7, "payment_reference", "(GC\\(12\\) 345)"),
  field(8, "mailing_address", "9 0 R"),
  "9 0 obj\n(Quezon City)\nendobj\n",
];

test("the last saved answer wins over the template, like a PDF viewer's update", () => {
  const { found, donor } = donationFromForm(pdf(...template, ...answers));
  assert.equal(found, true);
  assert.deepEqual(donor, { receiptName: "Ana Dela Cruz", receiptAddress: "Quezon City", amount: "1500", method: "gcash", receivedOn: "2026-11-05", reference: "GC(12) 345", acknowledge: "public", publicName: "Ana" });
});

test("fields inside a compressed object stream are read", () => {
  const objs = ["<< /FT /Tx /T (full_name) /V (Ben Reyes) >>", "<< /FT /Tx /T (amount) /V (250) >>"];
  const head = `10 0 11 ${objs[0].length + 1} `;
  const body = deflateSync(Buffer.from(head + objs.join(" "), "latin1"));
  const stream = `20 0 obj\n<< /Type /ObjStm /N 2 /First ${head.length} /Filter /FlateDecode /Length ${body.length} >>\nstream\n${body.toString("latin1")}\nendstream\nendobj\n`;
  const fields = pdfFormFields(pdf(stream));
  assert.equal(fields.full_name, "Ben Reyes");
  assert.equal(fields.amount, "250");
});

test("an unfilled form, a photo or a broken file gives nothing, never an error", () => {
  assert.equal(donationFromForm(pdf(...template)).donor.receiptName, "Someone Else"); // template only: that's what it says
  assert.equal(donationFromForm(Buffer.from([0xff, 0xd8, 0xff, 0xe0])).found, false);
  assert.equal(donationFromForm(Buffer.from("%PDF-1.4 garbage ( ( <<")).found, false);
  assert.equal(donationFromForm(Buffer.alloc(0)).found, false);
});

test("files are recognised by their bytes, not their name", () => {
  assert.equal(sniffFile(Buffer.from("%PDF-1.7")), "application/pdf");
  assert.equal(sniffFile(Buffer.from([0xff, 0xd8, 0xff, 0xdb])), "image/jpeg");
  assert.equal(sniffFile(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(sniffFile(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1")), "image/webp");
  assert.equal(sniffFile(Buffer.from("<html>")), null);
});

test("dates and amounts from the form", () => {
  assert.equal(formDate("11/19/2026"), "2026-11-19");
  assert.equal(formDate("2026-11-19"), "2026-11-19");
  assert.equal(formDate("November 19, 2026"), "2026-11-19");
  assert.equal(formDate("02/30/2026"), "");
  assert.equal(formDate("soon"), "");
  assert.equal(formAmount("500.00"), "500");
  assert.equal(formAmount("₱5,000"), "5000");
  assert.equal(formAmount("500.50"), "500.50"); // centavos: left for the admin to round
});

test("proceeds: received, checked with proof, still to check, pledged, by method", () => {
  const rows = [
    { id: "a", status: "received", amount: 500, method: "bank", verified_at: "2026-11-20" },
    { id: "b", status: "receipt_sent", amount: 1000, method: "gcash" },
    { id: "c", status: "received", amount: 250, method: null },
    { id: "d", status: "pledged", amount: 2000 },
    { id: "e", status: "declined", amount: 300 },
    { id: "f", status: "asked" },
  ];
  const t = donationTotals(rows, { a: 1, b: 2 });
  assert.equal(t.received, 1750);
  assert.equal(t.receivedCount, 3);
  assert.equal(t.checked, 500);
  assert.equal(t.toCheck, 1250);
  assert.equal(t.noProofCount, 1);
  assert.equal(t.pledged, 2000);
  assert.deepEqual(t.byMethod.map((m) => [m.key, m.amount]), [["bank", 500], ["gcash", 1000], ["", 250]]);
});

test("a donation is checked only when received, with an amount and proof, by someone who checks payments", () => {
  const ok = { status: "received", amount: 500, proofCount: 1, mayCheck: true };
  assert.equal(checkProblem(ok), "");
  assert.match(checkProblem({ ...ok, mayCheck: false }), /check payments/);
  assert.match(checkProblem({ ...ok, status: "pledged" }), /Received/);
  assert.match(checkProblem({ ...ok, amount: null }), /amount/);
  assert.match(checkProblem({ ...ok, proofCount: 0 }), /proof/);
});

test("the same reference on two donors is flagged on both", () => {
  const out = sameReferences([{ id: "a", name: "Ana", reference: "034 520" }, { id: "b", name: "Ben", reference: "034520" }, { id: "c", name: "Cy", reference: "999" }]);
  assert.deepEqual(out, { a: ["Ben"], b: ["Ana"] });
});

test("every column has a key and a label", () => {
  assert.ok(DONOR_COLUMNS.every((c) => c.key && c.label));
  assert.equal(new Set(DONOR_COLUMNS.map((c) => c.key)).size, DONOR_COLUMNS.length);
});
