export const RECOVERY_DAYS = 30;

/** Trimmed, single-spaced, lower-case: how names and emails are compared. */
export const normalizedIdentity = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");

export function sameRegistrant(a, b) {
  return normalizedIdentity(a?.email) === normalizedIdentity(b?.email) && normalizedIdentity(a?.name) === normalizedIdentity(b?.name);
}

export function deletionState(registration, now = new Date()) {
  if (registration?.deleted_at) {
    const expires = new Date(registration.deleted_at).getTime() + RECOVERY_DAYS * 86_400_000;
    return now.getTime() >= expires ? "expired" : "recoverable";
  }
  if (registration?.fee_status === "paid") return "paid";
  if (registration?.checked_in_at) return "checked-in";
  return "allowed";
}
