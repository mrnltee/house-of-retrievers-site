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
  // View-only rights for pages whose only right used to be "edit".
  "checkin:view": ["owner", "events", "checkin"],
  "media:view": ["owner", "content"],
  "emails:view": ["owner", "events"],
  "letters:view": ["owner", "events"],
  "journey:view": ["owner", "content"],
  "breeds:view": ["owner", "events"],
};

/**
 * Sidebar pages an Owner can give each person (owner, 2026-10-27), as View
 * (open and read) or Edit (also save, send, delete). Saved per person as
 * "key" for Edit and "key:view" for View. A person with saved pages sees
 * exactly those pages and nothing else, whatever their roles say; with none
 * saved, their roles decide. Owners always have every page; approving payment
 * changes and Admins & activity log stay Owner-only.
 */
export const PAGES = [
  { key: "dashboard", label: "Dashboard", group: "Run", path: "/", view: ["dashboard:view"], edit: [] },
  { key: "events", label: "Events", group: "Run", path: "/events", view: ["events:view"], edit: ["events:edit", "events:delete"] },
  { key: "registrations", label: "Registrations", group: "Run", path: "/registrations", view: ["registrations:view"], edit: ["registrations:edit", "registrations:fees"] },
  { key: "checkin", label: "Check-in", group: "Run", path: "/checkin", view: ["checkin:view"], edit: ["checkin"] },
  { key: "people", label: "People", group: "Run", path: "/people", view: ["people:view"], edit: ["people:edit"] },
  { key: "supporters", label: "Sponsors & partners", group: "Run", path: "/supporters", view: ["supporters:view"], edit: ["supporters:edit"] },
  { key: "media", label: "Media hub", group: "Publish", path: "/media", view: ["media:view"], edit: ["media:edit"] },
  { key: "payments", label: "Payment settings", group: "Money", path: "/payments", view: ["payments:view"], edit: ["payments:request"] },
  { key: "emails", label: "Email templates", group: "Settings", path: "/emails", view: ["emails:view"], edit: ["emails:edit"] },
  { key: "letters", label: "Letters", group: "Settings", path: "/letters", view: ["letters:view"], edit: ["letters:edit"] },
  { key: "journey", label: "Journey timeline", group: "Settings", path: "/journey", view: ["journey:view"], edit: ["journey:edit"] },
  { key: "breeds", label: "Breed icons", group: "Settings", path: "/breeds", view: ["breeds:view"], edit: ["breeds:edit"] },
];

/** "events:view" → { key: "events", level: "view" }; "events" → Edit. */
function pageEntry(entry) {
  const [key, level] = String(entry || "").split(":");
  const page = PAGES.find((p) => p.key === key);
  if (!page) return null;
  return { page, level: level === "view" || !page.edit.length ? "view" : "edit" };
}

/** Keeps known pages (one level each, Edit wins), in sidebar order. */
export function cleanPages(entries) {
  const list = (Array.isArray(entries) ? entries : [entries]).map(pageEntry).filter(Boolean);
  return PAGES.flatMap((page) => {
    const levels = list.filter((e) => e.page === page).map((e) => e.level);
    if (!levels.length) return [];
    return [levels.includes("edit") ? page.key : `${page.key}:view`];
  });
}

/** A person's level on a page from their saved entries: "edit", "view" or "". */
export function pageLevel(entries, key) {
  const hit = cleanPages(entries || []).find((e) => e.split(":")[0] === key);
  return hit ? (hit.endsWith(":view") ? "view" : "edit") : "";
}

/** What a person's roles give on each page, used to start the grid. */
export function pagesForRoles(roles) {
  return PAGES.flatMap((p) => {
    if (p.edit.some((cap) => can(roles, cap))) return [p.key];
    if (p.view.some((cap) => can(roles, cap))) return [`${p.key}:view`];
    return [];
  });
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
    return pages.map(pageEntry).some((e) => e && (e.page.view.includes(capability) || (e.level === "edit" && e.page.edit.includes(capability))));
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
