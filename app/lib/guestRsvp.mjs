/**
 * Guest tracker → RSVP list (owner, 2026-11-17). Pure rules, tested in guestRsvp.test.mjs; the database side
 * is guestRsvpStore.js.
 */

/** Which complimentary type a guest gets: VIP for guests of honor, celebrities and VIP furparents, else Guest. */
const VIP_CATEGORIES = new Set(["politician", "celebrity", "vip"]);
export function compTypeForGuest(guest = {}) {
  if (VIP_CATEGORIES.has(guest.category)) return "vip";
  if (/^\s*vip\b/i.test(String(guest.specification || ""))) return "vip";
  return "guest";
}

/** "  Dr.  Paolo   LIM " → "dr. paolo lim": how names are compared for duplicates (case and spacing ignored). */
export const nameKey = (name) => String(name || "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * What a reply change does to the RSVP list. `linked` is the registration the tracker knows about (or null),
 * `made` whether the tracker created it, `sameName` an active registration at the event with the same name.
 * Returns { op: "none" | "link" | "create" | "restore" | "cancel", id? }.
 */
export function rsvpChange({ reply, linked = null, made = false, sameName = null }) {
  const active = (r) => r && !r.deleted_at && r.status !== "cancelled";
  if (reply === "yes") {
    if (active(linked)) return { op: "none", id: linked.id };
    if (sameName) return { op: "link", id: sameName.id };
    if (linked && made && !linked.deleted_at && linked.status === "cancelled") return { op: "restore", id: linked.id };
    return { op: "create" };
  }
  // No reply yet / Can't make it: only an RSVP the tracker made, not yet checked in, is cancelled again.
  if (active(linked) && made && !linked.checked_in_at) return { op: "cancel", id: linked.id };
  return { op: "none" };
}
