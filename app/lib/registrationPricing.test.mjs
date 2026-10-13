import test from "node:test";
import assert from "node:assert/strict";
import { calculateAmountDue, cleanAttendeeCounts, cleanPricingBasis, paidAmountChangeAllowed } from "./registrationPricing.mjs";

test("keeps the existing one-ticket-per-registration default", () => {
  assert.deepEqual(calculateAmountDue({ tier: { amount: 795 }, humans: 3, furbabies: 2 }), { quantity: 1, amount: 795 });
  assert.equal(cleanPricingBasis("unknown"), "registration");
});

test("charges by people or furbabies", () => {
  assert.equal(calculateAmountDue({ basis: "human", tier: { amount: 350 }, humans: 2, furbabies: 1 }).amount, 700);
  assert.equal(calculateAmountDue({ basis: "furbaby", tier: { amount: 500 }, humans: 1, furbabies: 3 }).amount, 1500);
});

test("charges an additional fee for furbabies beyond the included companions", () => {
  assert.deepEqual(calculateAmountDue({ basis: "human_plus_furbaby", tier: { amount: 795 }, humans: 1, furbabies: 3, includedFurbabiesPerHuman: 1, additionalFurbabyFee: 200 }), { quantity: 1, extraFurbabies: 2, amount: 1195 });
});

test("charges enough bundles for the people and furbabies attending", () => {
  const result = calculateAmountDue({ basis: "bundle", tier: { amount: 795, bundleHumans: 1, bundleFurbabies: 1 }, humans: 2, furbabies: 1 });
  assert.deepEqual(result, { quantity: 2, amount: 1590 });
});

test("attendee counts are bounded and require one person", () => {
  assert.deepEqual(cleanAttendeeCounts(2, 1), { humans: 2, furbabies: 1 });
  assert.match(cleanAttendeeCounts(0, 1).error, /at least one person/);
  assert.match(cleanAttendeeCounts(1, 101).error, /0 to 100/);
});

test("allows a paid registration correction when the existing payment matches the new due", () => {
  assert.equal(paidAmountChangeAllowed({ oldDue: 695, nextDue: 2085, payAmount: 2085 }), true);
});

test("keeps paid amount changes blocked when the payment does not match", () => {
  assert.equal(paidAmountChangeAllowed({ oldDue: 695, nextDue: 2085, payAmount: 695 }), false);
  assert.equal(paidAmountChangeAllowed({ oldDue: 695, nextDue: 2085, payAmount: null }), false);
});
