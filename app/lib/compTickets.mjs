/**
 * Complimentary registrations (owner, 2026-11-11): an admin can add someone as
 * a Guest, VIP or Organizer instead of on a priced ticket. No price, no payment,
 * never offered on the public RSVP, and outside the event's capacity and any
 * first-N ticket limit (`r.comp_type IS NOT NULL` in the capacity SQL).
 * The ticket field sends "comp:<key>".
 */
export const COMP_TYPES = [
  { key: "guest", label: "Guest", hint: "Invited guest" },
  { key: "vip", label: "VIP", hint: "VIP or distinguished guest" },
  { key: "organizer", label: "Organizer", hint: "HOR team and admins" },
];

const KEYS = new Set(COMP_TYPES.map((t) => t.key));
const PREFIX = "comp:";

export const cleanCompType = (value) => (KEYS.has(String(value || "")) ? String(value) : null);

/** The ticket field's value ("comp:vip") → "vip", or null for an ordinary ticket. */
export function compFromTicket(value) {
  const v = String(value ?? "");
  return v.startsWith(PREFIX) ? cleanCompType(v.slice(PREFIX.length)) : null;
}

export const compValue = (key) => `${PREFIX}${key}`;

export const compLabel = (key) => COMP_TYPES.find((t) => t.key === key)?.label || "";

/** The ticket saved on a complimentary registration. */
export const compTicket = (key) => ({ label: compLabel(key), amount: 0 });

/** How a registration's ticket reads in the admin: "VIP · Complimentary", else the usual line. */
export function compLine(key) {
  const label = compLabel(key);
  return label ? `${label} · Complimentary` : "";
}
