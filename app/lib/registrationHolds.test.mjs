import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVE_REGISTRATION_SQL, PAYMENT_HOLD_MINUTES, holdExpiresAt, isActiveRegistrationHold } from "./registrationHolds.mjs";

test("creates a ten-minute payment hold by default", () => {
  const start = new Date("2026-10-16T00:00:00.000Z");
  assert.equal(holdExpiresAt(start).toISOString(), "2026-10-16T00:10:00.000Z");
  assert.equal(PAYMENT_HOLD_MINUTES, 10);
});

test("only an expired waiting payment hold becomes inactive", () => {
  const now = new Date("2026-10-16T00:10:00.000Z");
  assert.equal(isActiveRegistrationHold({ feeStatus: "waiting", holdExpiresAt: "2026-10-16T00:09:59.000Z" }, now), false);
  assert.equal(isActiveRegistrationHold({ feeStatus: "waiting", holdExpiresAt: "2026-10-16T00:10:01.000Z" }, now), true);
  assert.equal(isActiveRegistrationHold({ feeStatus: "review", holdExpiresAt: "2026-10-16T00:01:00.000Z" }, now), true);
  assert.match(ACTIVE_REGISTRATION_SQL, /hold_expires_at/);
});
