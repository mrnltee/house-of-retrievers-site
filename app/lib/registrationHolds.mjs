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

/** Longest custom hold: 7 days (migration 041). */
export const MAX_PAYMENT_HOLD_MINUTES = 10080;

/** The editor's choice (a quick pick or a custom hours + minutes total, or the saved column) → whole minutes 0–7 days, or null to inherit the default. */
export function cleanPaymentHoldMinutes(input) {
  if (input === "" || input === undefined || input === null) return null;
  const minutes = Number(input);
  return Number.isInteger(minutes) && minutes >= 0 && minutes <= MAX_PAYMENT_HOLD_MINUTES ? minutes : null;
}

/** Whether a saved hold length is one of the quick picks (else the editor shows it as Custom). */
export function isPresetHold(minutes) {
  return HOLD_MINUTES_VALUES.has(Number(minutes));
}

export function holdParts(minutes) {
  const n = Math.max(0, Number(minutes) || 0);
  return { hours: Math.floor(n / 60), minutes: n % 60 };
}

/** 390 → "6 h 30 min". */
export function holdLabel(minutes) {
  const { hours, minutes: rest } = holdParts(minutes);
  return [hours ? `${hours} h` : "", rest ? `${rest} min` : ""].filter(Boolean).join(" ") || "0 min";
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
