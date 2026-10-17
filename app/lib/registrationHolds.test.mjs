import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_REGISTRATION_SQL,
  DEFAULT_PAYMENT_HOLD_MINUTES,
  cleanPaymentHoldMinutes,
  holdExpiresAt,
  isActiveRegistrationHold,
  lateProofFits,
  resolveHoldMinutes,
} from "./registrationHolds.mjs";

test("the default payment hold is 24 hours", () => {
  const start = new Date("2026-10-16T00:00:00.000Z");
  assert.equal(DEFAULT_PAYMENT_HOLD_MINUTES, 1440);
  assert.equal(holdExpiresAt(start).toISOString(), "2026-10-17T00:00:00.000Z");
  assert.equal(holdExpiresAt(start, 10).toISOString(), "2026-10-16T00:10:00.000Z");
  assert.equal(holdExpiresAt(start, null), null);
});

test("resolveHoldMinutes: NULL inherits the default, 0 is no limit, otherwise the saved value", () => {
  assert.equal(resolveHoldMinutes(null), DEFAULT_PAYMENT_HOLD_MINUTES);
  assert.equal(resolveHoldMinutes(undefined), DEFAULT_PAYMENT_HOLD_MINUTES);
  assert.equal(resolveHoldMinutes(0), null);
  assert.equal(resolveHoldMinutes(10), 10);
  assert.equal(resolveHoldMinutes(2880), 2880);
});

test("cleanPaymentHoldMinutes: only the offered options are kept, empty inherits the default", () => {
  assert.equal(cleanPaymentHoldMinutes(""), null);
  assert.equal(cleanPaymentHoldMinutes(undefined), null);
  assert.equal(cleanPaymentHoldMinutes("10"), 10);
  assert.equal(cleanPaymentHoldMinutes("0"), 0);
  assert.equal(cleanPaymentHoldMinutes("1440"), 1440);
  assert.equal(cleanPaymentHoldMinutes("45"), null);
});

test("only an expired waiting payment hold becomes inactive", () => {
  const now = new Date("2026-10-16T00:10:00.000Z");
  assert.equal(isActiveRegistrationHold({ feeStatus: "waiting", holdExpiresAt: "2026-10-16T00:09:59.000Z" }, now), false);
  assert.equal(isActiveRegistrationHold({ feeStatus: "waiting", holdExpiresAt: "2026-10-16T00:10:01.000Z" }, now), true);
  assert.equal(isActiveRegistrationHold({ feeStatus: "review", holdExpiresAt: "2026-10-16T00:01:00.000Z" }, now), true);
  // A "no limit" hold (no expiry saved) is always active.
  assert.equal(isActiveRegistrationHold({ feeStatus: "waiting", holdExpiresAt: null }, now), true);
  assert.match(ACTIVE_REGISTRATION_SQL, /hold_expires_at/);
});

test("lateProofFits: a late receipt is accepted only while capacity and the ticket's first-N units still fit", () => {
  assert.equal(lateProofFits(), true);
  assert.equal(lateProofFits({ capacity: 50, capacityUsed: 48, capacityUnits: 2 }), true);
  assert.equal(lateProofFits({ capacity: 50, capacityUsed: 49, capacityUnits: 2 }), false);
  assert.equal(lateProofFits({ capacity: null, capacityUsed: 999, capacityUnits: 2 }), true);
  assert.equal(lateProofFits({ tierLimit: 20, tierLeft: 1, tierUnits: 1 }), true);
  assert.equal(lateProofFits({ tierLimit: 20, tierLeft: 0, tierUnits: 1 }), false);
  assert.equal(lateProofFits({ tierLimit: null, tierLeft: 0, tierUnits: 5 }), true);
});
