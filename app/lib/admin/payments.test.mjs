import { test } from "node:test";
import assert from "node:assert/strict";

test("letters take HOR's bank and GCash from Payment settings (only enabled methods)", async () => {
  const { paymentLetterFills } = await import("./payments.mjs");
  const rows = [
    { key: "bank", enabled: true, details: { bankName: "BDO", accountName: "The House of Retrievers' Society, Inc.", accountNumber: "001234567890" } },
    { key: "gcash", enabled: true, details: { accountName: "A. Serrano", number: "09171234567" } },
    { key: "maya", enabled: true, details: { accountName: "X", number: "09990000000" } },
  ];
  assert.deepEqual(paymentLetterFills(rows), {
    "HOR Bank": "BDO",
    "HOR Account Name": "The House of Retrievers' Society, Inc.",
    "HOR Account Number": "001234567890",
    "HOR GCash Number / Name": "0917 123 4567 / A. Serrano",
  });
  assert.deepEqual(paymentLetterFills([{ ...rows[0], enabled: false }]), {});
  assert.deepEqual(paymentLetterFills([]), {});
});
