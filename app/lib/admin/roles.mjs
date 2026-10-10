/**
 * Admin roles and what each may do. Every server action checks `can()` against
 * the roles read fresh from the database, so removing someone takes effect on
 * their next click, not when their session expires.
 */

export const ROLES = ["owner", "events", "treasurer", "content", "checkin"];

export const ROLE_LABELS = {
  owner: "Owner",
  events: "Events lead",
  treasurer: "Treasurer",
  content: "Content editor",
  checkin: "Check-in helper",
};

const PERMISSIONS = {
  "dashboard:view": ["owner", "events", "treasurer", "content"],
  "events:view": ["owner", "events", "treasurer", "content"],
  "events:edit": ["owner", "events"],
  "events:delete": ["owner", "events"],
  "registrations:view": ["owner", "events", "treasurer"],
  "registrations:edit": ["owner", "events"],
  "registrations:fees": ["owner", "events", "treasurer"],
  checkin: ["owner", "events", "checkin"],
  "people:view": ["owner", "events", "treasurer"],
  "people:edit": ["owner", "events"],
  "payments:view": ["owner", "treasurer"],
  "payments:request": ["owner", "treasurer"],
  "payments:approve": ["owner"],
  "admins:manage": ["owner"],
  "log:view": ["owner"],
};

/** True when any of `roles` grants `capability`. Unknown capabilities are denied. */
export function can(roles, capability) {
  const allowed = PERMISSIONS[capability];
  if (!allowed || !Array.isArray(roles)) return false;
  return roles.some((role) => allowed.includes(role));
}

/** "a@x.com, B@y.com" → ["a@x.com", "b@y.com"] */
export function parseEmailList(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

/** Keeps only known roles, de-duplicated, in the canonical order. */
export function cleanRoles(roles) {
  const wanted = new Set(Array.isArray(roles) ? roles : [roles]);
  return ROLES.filter((role) => wanted.has(role));
}

/**
 * A payment change may be approved only by an active Owner who is not the
 * person who asked for it.
 */
export function canApprovePaymentChange({ requestedBy, approverEmail, approverRoles }) {
  if (!approverEmail || !requestedBy) return false;
  if (approverEmail.toLowerCase() === requestedBy.toLowerCase()) return false;
  return can(approverRoles, "payments:approve");
}

/**
 * Approving money details needs a fresh sign-in, so a session left open on a
 * shared laptop cannot be used to redirect donations.
 */
export const RECENT_SIGN_IN_MS = 10 * 60 * 1000;

export function signedInRecently(authTimeMs, now = Date.now()) {
  return Number.isFinite(authTimeMs) && now - authTimeMs <= RECENT_SIGN_IN_MS;
}
