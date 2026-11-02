import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEventDonor, donorCounts, DONOR_STATUSES } from "./eventDonors.mjs";

test("a donor's details for one event are cleaned", () => {
  const { donor } = cleanEventDonor({ status: "received", askedVia: "instagram", amount: "₱5,000", method: "gcash", receivedOn: "2026-11-05", reference: " 123 ", receiptName: "Jessie Gabriel", receiptAddress: "QC", acknowledge: "public", publicName: "Jessie G.", notes: "" });
  assert.deepEqual(donor, { status: "received", askedVia: "instagram", amount: 5000, method: "gcash", receivedOn: "2026-11-05", reference: "123", receiptName: "Jessie Gabriel", receiptAddress: "QC", acknowledge: "public", publicName: "Jessie G.", notes: null });
});

test("blank amount, method and date stay empty; unknown choices fall back", () => {
  const { donor } = cleanEventDonor({ status: "nope", askedVia: "x", amount: "", method: "", receivedOn: "" });
  assert.equal(donor.status, "asked");
  assert.equal(donor.askedVia, "email");
  assert.equal(donor.amount, null);
  assert.equal(donor.method, null);
  assert.equal(donor.receivedOn, null);
  assert.equal(donor.acknowledge, "private");
});

test("received needs an amount; a bad date or amount is refused", () => {
  assert.match(cleanEventDonor({ status: "received" }).error, /amount/i);
  assert.match(cleanEventDonor({ amount: "abc" }).error, /amount/i);
  assert.match(cleanEventDonor({ amount: "100", receivedOn: "5 Nov" }).error, /date/i);
  assert.match(cleanEventDonor({ acknowledge: "public" }).error, /name to publish/i);
});

test("totals: pledged waiting vs received, and receipts still to send", () => {
  const rows = [
    { status: "asked", amount: null },
    { status: "pledged", amount: 2000 },
    { status: "received", amount: 5000 },
    { status: "receipt_sent", amount: 1000 },
    { status: "declined", amount: 300 },
  ];
  assert.deepEqual(donorCounts(rows), { donors: 5, asked: 1, pledged: 2000, received: 6000, gave: 2, receiptsDue: 1, declined: 1 });
  assert.equal(DONOR_STATUSES.length, 5);
});
