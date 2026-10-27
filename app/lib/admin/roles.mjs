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
  "media:edit": ["owner", "content"],
  "supporters:view": ["owner", "events", "treasurer"],
  "supporters:edit": ["owner", "events"],
  "emails:edit": ["owner", "events"],
  "letters:edit": ["owner", "events"],
  "journey:edit": ["owner", "content"],
  "breeds:edit": ["owner", "events"],
};

/**
 * Sidebar pages an Owner can tick per person (owner, 2026-10-27). When a
 * person has ticks, they see exactly those pages and can do everything on
 * them; nothing else, whatever their roles say. With no ticks saved, their
 * roles decide as before. Owners always have every page. Approving payment
 * changes and Admins & activity log stay Owner-only.
 */
export const PAGES = [
  { key: "dashboard", label: "Dashboard", group: "Run", path: "/", caps: ["dashboard:view"] },
  { key: "events", label: "Events", group: "Run", path: "/events", caps: ["events:view", "events:edit", "events:delete"] },
  { key: "registrations", label: "Registrations", group: "Run", path: "/registrations", caps: ["registrations:view", "registrations:edit", "registrations:fees"] },
  { key: "checkin", label: "Check-in", group: "Run", path: "/checkin", caps: ["checkin"] },
  { key: "people", label: "People", group: "Run", path: "/people", caps: ["people:view", "people:edit"] },
  { key: "supporters", label: "Sponsors & partners", group: "Run", path: "/supporters", caps: ["supporters:view", "supporters:edit"] },
  { key: "media", label: "Media hub", group: "Publish", path: "/media", caps: ["media:edit"] },
  { key: "payments", label: "Payment settings", group: "Money", path: "/payments", caps: ["payments:view", "payments:request"] },
  { key: "emails", label: "Email templates", group: "Settings", path: "/emails", caps: ["emails:edit"] },
  { key: "letters", label: "Letters", group: "Settings", path: "/letters", caps: ["letters:edit"] },
  { key: "journey", label: "Journey timeline", group: "Settings", path: "/journey", caps: ["journey:edit"] },
  { key: "breeds", label: "Breed icons", group: "Settings", path: "/breeds", caps: ["breeds:edit"] },
];

/** Keeps only known page keys, in sidebar order. */
export function cleanPages(pages) {
  const wanted = new Set(Array.isArray(pages) ? pages : [pages]);
  return PAGES.map((p) => p.key).filter((key) => wanted.has(key));
}

/** The pages a person's roles open, used to pre-tick the grid. */
export function pagesForRoles(roles) {
  return PAGES.filter((p) => p.caps.some((cap) => can(roles, cap))).map((p) => p.key);
}

/**
 * True when `who` may use `capability`. `who` is a roles array, or an admin
 * ({ roles, pages }); an admin with page ticks (and not an Owner) gets exactly
 * the capabilities of the ticked pages. Unknown capabilities are denied.
 */
export function can(who, capability) {
  const roles = Array.isArray(who) ? who : who?.roles;
  const pages = Array.isArray(who) ? null : who?.pages;
  if (Array.isArray(pages) && Array.isArray(roles) && !roles.includes("owner")) {
    return PAGES.some((p) => pages.includes(p.key) && p.caps.includes(capability));
  }
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
