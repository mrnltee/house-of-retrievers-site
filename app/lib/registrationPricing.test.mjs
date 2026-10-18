import test from "node:test";
import assert from "node:assert/strict";
import { calculateAmountDue, checkAttendeeLimits, overpaidBy, cleanAttendeeCounts, cleanPricingBasis, cleanTieredTicketRule, paidAmountChangeAllowed, ticketLimitLine, ticketLimitUnits, ticketLimitUnitLabel } from "./registrationPricing.mjs";

test("Early Bird units follow the ticket's attendance basis", () => {
  assert.equal(ticketLimitUnits("human", {}, 3, 0), 3);
  assert.equal(ticketLimitUnits("human_plus_furbaby", {}, 3, 1), 3);
  assert.equal(ticketLimitUnits("furbaby", {}, 3, 2), 2);
  assert.equal(ticketLimitUnits("tiered", { attendanceBasis: "human_only" }, 3, 0), 3);
  assert.equal(ticketLimitUnits("tiered", { attendanceBasis: "furbaby_package" }, 3, 2), 2);
  assert.equal(ticketLimitUnits("registration", {}, 3, 2), 1);
  assert.equal(ticketLimitUnitLabel("human_plus_furbaby"), "hoomans");
  assert.equal(ticketLimitUnitLabel("tiered", { attendanceBasis: "furbaby_package" }), "furbabies");
  assert.equal(ticketLimitUnitLabel("registration"), "registrations");
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

test("the RSVP's Early Bird line speaks to guests, never in units", () => {
  assert.equal(ticketLimitLine("registration", { limit: 20 }, 20), "First 20 registrants · 20 left");
  assert.equal(ticketLimitLine("registration", { limit: 20 }, 1), "First 20 registrants · 1 left");
  assert.equal(ticketLimitLine("human", { limit: 30 }, 4), "First 30 hoomans · 4 left");
  assert.equal(ticketLimitLine("tiered", { limit: 10, attendanceBasis: "furbaby_package" }, 10), "First 10 furbabies · 10 left");
});

test("attendee limits: most furbabies per registration and most people per furbaby", async () => {
  const { checkAttendeeLimits } = await import("./registrationPricing.mjs");
  const limits = { maxFurbabies: 2, maxHumansPerFurbaby: 2 };
  assert.deepEqual(checkAttendeeLimits({ basis: "furbaby", humans: 2, furbabies: 1, ...limits }), {});
  assert.deepEqual(checkAttendeeLimits({ basis: "furbaby", humans: 4, furbabies: 2, ...limits }), {});
  assert.match(checkAttendeeLimits({ basis: "furbaby", humans: 2, furbabies: 3, ...limits }).error, /up to 2 furbabies per RSVP/);
  assert.match(checkAttendeeLimits({ basis: "furbaby", humans: 3, furbabies: 1, ...limits }).error, /up to 2 people for 1 furbaby/);
  assert.match(checkAttendeeLimits({ basis: "furbaby", humans: 5, furbabies: 2, ...limits }).error, /up to 4 people for 2 furbabies/);
});

test("per-furbaby pricing needs at least one furbaby, so no one pays ₱0", async () => {
  const { checkAttendeeLimits } = await import("./registrationPricing.mjs");
  assert.match(checkAttendeeLimits({ basis: "furbaby", humans: 1, furbabies: 0 }).error, /at least one furbaby/);
  assert.deepEqual(checkAttendeeLimits({ basis: "registration", humans: 1, furbabies: 0, maxHumansPerFurbaby: 2 }), {});
});

test("events without limits behave as before", async () => {
  const { checkAttendeeLimits, cleanAttendeeLimit } = await import("./registrationPricing.mjs");
  assert.deepEqual(checkAttendeeLimits({ basis: "registration", humans: 20, furbabies: 10 }), {});
  assert.equal(cleanAttendeeLimit(""), null);
  assert.equal(cleanAttendeeLimit("2"), 2);
  assert.equal(cleanAttendeeLimit("0"), null);
  assert.equal(cleanAttendeeLimit("abc"), null);
  assert.equal(cleanAttendeeLimit("50"), 20);
});

test("base_plus: the base covers 1 hooman + 1 furbaby, each extra uses its tier's fee", () => {
  const early = { label: "Early Bird", amount: 1750, extraFurbabyFee: 850, extraHumanFee: 900, limit: 20 };
  const regular = { label: "Regular", amount: 1950, extraFurbabyFee: 950, extraHumanFee: 1000 };
  assert.equal(cleanPricingBasis("base_plus"), "base_plus");
  assert.equal(calculateAmountDue({ basis: "base_plus", tier: early, humans: 1, furbabies: 1 }).amount, 1750);
  assert.equal(calculateAmountDue({ basis: "base_plus", tier: early, humans: 2, furbabies: 2 }).amount, 3500);
  assert.equal(calculateAmountDue({ basis: "base_plus", tier: regular, humans: 2, furbabies: 2 }).amount, 3900);
  assert.equal(calculateAmountDue({ basis: "base_plus", tier: regular, humans: 3, furbabies: 1 }).amount, 3950);
  assert.equal(calculateAmountDue({ basis: "base_plus", tier: early, humans: 1, furbabies: 0 }).amount, 1750);
});

test("base_plus: a first-N limit counts registrations", () => {
  assert.equal(ticketLimitUnits("base_plus", {}, 3, 2), 1);
  assert.equal(ticketLimitUnitLabel("base_plus", {}), "registrations");
});

test("base_plus Hooman only ticket: amount per hooman, no furbabies", () => {
  const tier = { label: "Hooman only", amount: 1850, attendanceBasis: "human_only" };
  assert.equal(calculateAmountDue({ basis: "base_plus", tier, humans: 2, furbabies: 0 }).amount, 3700);
  assert.match(calculateAmountDue({ basis: "base_plus", tier, humans: 1, furbabies: 1 }).error, /Hooman only/);
});

test("base_plus limits can count furbabies or hoomans per ticket", () => {
  assert.equal(ticketLimitUnits("base_plus", { limitUnit: "furbabies" }, 3, 2), 2);
  assert.equal(ticketLimitUnits("base_plus", { limitUnit: "hoomans" }, 3, 2), 3);
  assert.equal(ticketLimitUnits("base_plus", {}, 3, 2), 1);
  assert.equal(ticketLimitUnitLabel("base_plus", { limitUnit: "furbabies" }), "furbabies");
  assert.equal(ticketLimitLine("base_plus", { limit: 20, limitUnit: "furbabies" }, 5), "First 20 furbabies · 5 left");
});

test("checkAttendeeLimits: the public RSVP's own maximum (20 hoomans, 10 furbabies) holds without an event limit", () => {
  assert.match(checkAttendeeLimits({ basis: "base_plus", humans: 21, furbabies: 1 }).error, /20 hoomans/);
  assert.match(checkAttendeeLimits({ basis: "base_plus", humans: 1, furbabies: 11 }).error, /10 furbabies/);
  assert.deepEqual(checkAttendeeLimits({ basis: "base_plus", humans: 20, furbabies: 10 }), {});
});

test("base_plus prices by pairs: every hooman + furbaby pair pays the pair price, leftovers pay their add-on", () => {
  const early = { label: "Early Bird", amount: 1750, extraHumanFee: 1750, extraFurbabyFee: 750 };
  const regular = { label: "Regular", amount: 1950, extraHumanFee: 1850, extraFurbabyFee: 750 };
  const due = (tier, h, f) => calculateAmountDue({ basis: "base_plus", tier, humans: h, furbabies: f }).amount;
  assert.equal(due(early, 1, 1), 1750);
  assert.equal(due(early, 2, 2), 3500);
  assert.equal(due(early, 2, 1), 3500);
  assert.equal(due(early, 3, 1), 5250);
  assert.equal(due(early, 1, 2), 2500);
  assert.equal(due(early, 3, 2), 5250);
  assert.equal(due(early, 1, 0), 1750);
  assert.equal(due(regular, 2, 2), 3900);
  assert.equal(due(regular, 2, 1), 3800);
  assert.equal(due(regular, 1, 2), 2700);
  assert.equal(due(regular, 3, 3), 5850);
});

test("overpaidBy: how much a paid registration paid over what it owes now", () => {
  assert.equal(overpaidBy({ payAmount: 4250, due: 3500 }), 750);
  assert.equal(overpaidBy({ payAmount: 3500, due: 3500 }), 0);
  assert.equal(overpaidBy({ payAmount: 3000, due: 3500 }), 0);
  assert.equal(overpaidBy({ payAmount: null, due: 3500 }), 0);
  assert.equal(overpaidBy({ payAmount: 4250, due: 3500, refunded: 750 }), 0);
});
