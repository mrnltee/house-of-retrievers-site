/** The payment window for a newly created paid registration. */
export const PAYMENT_HOLD_MINUTES = 10;

export function holdExpiresAt(now = new Date(), minutes = PAYMENT_HOLD_MINUTES) {
  return new Date(new Date(now).getTime() + minutes * 60_000);
}

/** A waiting payment hold is active only until its expiry. Other states stay active. */
export function isActiveRegistrationHold({ feeStatus, holdExpiresAt: expiresAt }, now = new Date()) {
  if (feeStatus !== "waiting") return true;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > new Date(now).getTime();
}

export const ACTIVE_REGISTRATION_SQL = `(r.fee_status <> 'waiting' OR r.hold_expires_at IS NULL OR r.hold_expires_at > now())`;
