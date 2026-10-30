import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPromo, cleanPromoCodes, findPromo, normalizeCode, promoLabel, promoProblem, promoSnapshot } from "./promoCodes.mjs";
import { calculateAmountDue } from "./registrationPricing.mjs";

test("codes are typed in any case, spaces dropped", () => {
  assert.equal(normalizeCode(" golden 20 "), "GOLDEN20");
  const { codes } = cleanPromoCodes([{ code: "Golden20", kind: "percent", percent: "20" }]);
  assert.equal(findPromo(codes, "golden20").code, "GOLDEN20");
  assert.equal(findPromo(codes, "OTHER"), null);
});

test("admin input is checked: length, duplicates, percent, dates, uses", () => {
  assert.match(cleanPromoCodes([{ code: "AB", percent: 10 }]).error, /at least 3/);
  assert.match(cleanPromoCodes([{ code: "ABC", percent: 10 }, { code: "abc", percent: 5 }]).error, /twice/);
  assert.match(cleanPromoCodes([{ code: "ABC", percent: 0 }]).error, /1 to 100/);
  assert.match(cleanPromoCodes([{ code: "ABC", percent: 10, from: "2026-12-02", until: "2026-12-01" }]).error, /after/);
  assert.match(cleanPromoCodes([{ code: "ABC", percent: 10, limit: "0" }]).error, /1 or more/);
  assert.deepEqual(cleanPromoCodes([{ code: "freebie", kind: "free_one", limit: "5", until: "2026-11-30" }]).codes,
    [{ code: "FREEBIE", kind: "free_one", percent: null, from: null, until: "2026-11-30", limit: 5 }]);
  assert.deepEqual(cleanPromoCodes("[]").codes, []);
  assert.deepEqual(cleanPromoCodes([{ code: "" }]).codes, []);
});

test("a code works only in its period and until its uses run out", () => {
  const promo = { code: "ABC", kind: "percent", percent: 10, from: "2026-11-01", until: "2026-11-30", limit: 2 };
  assert.equal(promoProblem(promo, { today: "2026-11-15", used: 1 }), "");
  assert.match(promoProblem(promo, { today: "2026-10-31", used: 0 }), /isn.t active yet/);
  assert.match(promoProblem(promo, { today: "2026-12-01", used: 0 }), /expired/);
  assert.match(promoProblem(promo, { today: "2026-11-15", used: 2 }), /fully used/);
  assert.match(promoProblem(null, { today: "2026-11-15" }), /isn't valid/);
});

test("1 free: per furbaby, 3 furbabies → 1 free, 2 at the regular rate", () => {
  const tier = { label: "Regular", amount: 500 };
  const due = calculateAmountDue({ basis: "furbaby", tier, humans: 1, furbabies: 3 });
  assert.deepEqual(applyPromo({ kind: "free_one" }, due, tier), { discount: 500, amount: 1000 });
});

test("1 free: per person, and a one-price registration becomes free", () => {
  const tier = { amount: 750 };
  assert.deepEqual(applyPromo({ kind: "free_one" }, calculateAmountDue({ basis: "human", tier, humans: 2, furbabies: 0 }), tier), { discount: 750, amount: 750 });
  assert.deepEqual(applyPromo({ kind: "free_one" }, calculateAmountDue({ basis: "registration", tier, humans: 3, furbabies: 2 }), tier), { discount: 750, amount: 0 });
});

test("1 free: hooman + furbaby pair pricing takes one pair off, extras still charged", () => {
  const tier = { amount: 1750, extraHumanFee: 600, extraFurbabyFee: 900 };
  const due = calculateAmountDue({ basis: "base_plus", tier, humans: 3, furbabies: 2 });
  assert.equal(due.amount, 2 * 1750 + 600);
  assert.deepEqual(applyPromo({ kind: "free_one" }, due, tier), { discount: 1750, amount: 1750 + 600 });
});

test("% off the whole amount, rounded to the peso", () => {
  assert.deepEqual(applyPromo({ kind: "percent", percent: 15 }, { amount: 1999, quantity: 1 }, { amount: 1999 }), { discount: 300, amount: 1699 });
  assert.deepEqual(applyPromo({ kind: "percent", percent: 100 }, { amount: 500 }, { amount: 500 }), { discount: 500, amount: 0 });
  assert.deepEqual(applyPromo(null, { amount: 500 }, {}), { discount: 0, amount: 500 });
});

test("labels and the snapshot kept on a registration", () => {
  assert.equal(promoLabel({ kind: "percent", percent: 20 }), "20% off");
  assert.equal(promoLabel({ kind: "free_one" }), "1 free");
  assert.deepEqual(promoSnapshot({ code: "abc", kind: "free_one", percent: null, limit: 3 }), { code: "ABC", kind: "free_one", percent: null });
});
