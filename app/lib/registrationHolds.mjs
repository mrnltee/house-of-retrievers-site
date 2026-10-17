/**
 * A paid registration starts as "waiting": the spot is held until proof is
 * sent. How long that hold lasts is a per-event setting
 * (`events.payment_hold_minutes`, migration 034): NULL inherits
 * DEFAULT_PAYMENT_HOLD_MINUTES, 0 means no limit, anything else is exact
 * minutes. A null `hold_expires_at` already means "always active" below, so
 * "no limit" is simply never setting an expiry.
 */

export const PAYMENT_HOLD_OPTIONS = [
  [10, "10 minutes"],
  [60, "1 hour"],
  [1440, "24 hours"],
  [2880, "48 hours"],
  [0, "No limit"],
];
const HOLD_MINUTES_VALUES = new Set(PAYMENT_HOLD_OPTIONS.map(([minutes]) => minutes));

/** The hold length when an event doesn't set its own. */
export const DEFAULT_PAYMENT_HOLD_MINUTES = 1440;

/** The editor's choice (a string from the select, or the saved column) → a valid option, or null to inherit the default. */
export function cleanPaymentHoldMinutes(input) {
  if (input === "" || input === undefined || input === null) return null;
  const minutes = Number(input);
  return HOLD_MINUTES_VALUES.has(minutes) ? minutes : null;
}

/** An event's saved payment_hold_minutes → the minutes to hold a new payment for, or null for no limit. */
export function resolveHoldMinutes(paymentHoldMinutes) {
  const minutes = paymentHoldMinutes == null ? DEFAULT_PAYMENT_HOLD_MINUTES : Number(paymentHoldMinutes);
  return minutes === 0 ? null : minutes;
}

/** `minutes` is the resolved value above: null means no expiry at all. */
export function holdExpiresAt(now = new Date(), minutes = DEFAULT_PAYMENT_HOLD_MINUTES) {
  if (minutes == null) return null;
  return new Date(new Date(now).getTime() + minutes * 60_000);
}

/** A waiting payment hold is active only until its expiry. Other states stay active. */
export function isActiveRegistrationHold({ feeStatus, holdExpiresAt: expiresAt }, now = new Date()) {
  if (feeStatus !== "waiting") return true;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > new Date(now).getTime();
}

export const ACTIVE_REGISTRATION_SQL = `(r.fee_status <> 'waiting' OR r.hold_expires_at IS NULL OR r.hold_expires_at > now())`;

/**
 * Whether a late payment proof, sent after its hold expired, can still be
 * accepted: the registration's capacity units still fit the event (when it
 * has a limit), and, for a first-N ticket, its units still fit what's left
 * of that tier. The caller looks up capacity and tier counts under the event
 * row lock; this only applies the rule.
 */
export function lateProofFits({ capacity = null, capacityUsed = 0, capacityUnits = 0, tierLimit = null, tierLeft = null, tierUnits = 0 } = {}) {
  if (capacity != null && Number(capacityUsed) + Number(capacityUnits) > capacity) return false;
  if (tierLimit && Number(tierUnits) > (tierLeft ?? Infinity)) return false;
  return true;
}
