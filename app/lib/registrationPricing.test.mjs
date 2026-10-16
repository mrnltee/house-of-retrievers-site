import test from "node:test";
import assert from "node:assert/strict";
import { calculateAmountDue, cleanAttendeeCounts, cleanPricingBasis, cleanTieredTicketRule, paidAmountChangeAllowed, ticketLimitUnits } from "./registrationPricing.mjs";

test("Early Bird units follow the ticket's attendance basis", () => {
  assert.equal(ticketLimitUnits("human", {}, 3, 0), 3);
  assert.equal(ticketLimitUnits("human_plus_furbaby", {}, 3, 1), 3);
  assert.equal(ticketLimitUnits("furbaby", {}, 3, 2), 2);
  assert.equal(ticketLimitUnits("tiered", { attendanceBasis: "human_only" }, 3, 0), 3);
  assert.equal(ticketLimitUnits("tiered", { attendanceBasis: "furbaby_package" }, 3, 2), 2);
  assert.equal(ticketLimitUnits("registration", {}, 3, 2), 1);
});

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

test("keeps furbabies out of Hooman only tickets and charges each person", () => {
  assert.deepEqual(calculateAmountDue({ basis: "tiered", tier: { amount: 100, attendanceBasis: "human_only" }, humans: 2, furbabies: 0 }), { quantity: 2, amount: 200 });
  assert.match(calculateAmountDue({ basis: "tiered", tier: { amount: 100, attendanceBasis: "human_only" }, humans: 1, furbabies: 1 }).error, /cannot include a furbaby/);
});

test("charges furbaby packages and an extra fee for people beyond the included count", () => {
  const tier = { amount: 760, attendanceBasis: "furbaby_package", includedHumansPerFurbaby: 2, additionalHumanFee: 100 };
  assert.deepEqual(calculateAmountDue({ basis: "tiered", tier, humans: 2, furbabies: 1 }), { quantity: 1, extraHumans: 0, amount: 760 });
  assert.deepEqual(calculateAmountDue({ basis: "tiered", tier, humans: 3, furbabies: 1 }), { quantity: 1, extraHumans: 1, amount: 860 });
  assert.match(calculateAmountDue({ basis: "tiered", tier, humans: 1, furbabies: 0 }).error, /at least one furbaby/);
});

test("requires complete ticket-specific attendance rules", () => {
  assert.match(cleanTieredTicketRule({ attendanceBasis: "furbaby_package", includedHumansPerFurbaby: 0, additionalHumanFee: 100 }).error, /1 to 100/);
  assert.match(cleanTieredTicketRule({ attendanceBasis: "unknown" }).error, /Choose whether/);
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
