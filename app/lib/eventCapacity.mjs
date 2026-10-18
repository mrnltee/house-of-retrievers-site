/**
 * Capacity is the number of places a registration consumes at the venue.
 * It is deliberately separate from pricing: a ticket can be priced as a
 * bundle while the venue still counts one registration as one booking.
 */

export const CAPACITY_BASES = [
  ["registration", "One slot per registration"],
  ["human", "One slot per hooman"],
  ["furbaby", "One slot per furbaby"],
];

const CAPACITY_KEYS = new Set(CAPACITY_BASES.map(([key]) => key));

export function cleanCapacityBasis(value) {
  return CAPACITY_KEYS.has(value) ? value : "registration";
}

export function capacityUnits(basis, { humans = 1, furbabies = 0 } = {}) {
  switch (cleanCapacityBasis(basis)) {
    case "human": return Number(humans) || 0;
    case "furbaby": return Number(furbabies) || 0;
    default: return 1;
  }
}

export function capacityUnitLabel(basis, plural = true) {
  const key = cleanCapacityBasis(basis);
  if (key === "human") return plural ? "hoomans" : "hooman";
  if (key === "furbaby") return plural ? "furbabies" : "furbaby";
  return plural ? "registrations" : "registration";
}

/** A furbaby-capacity event cannot accept a registration with no furbaby. */
/** `allowNoFurbaby`: a Hooman only ticket (or an existing registration being rechecked) uses no furbaby slot. */
export function validateCapacityCounts(basis, humans, furbabies, { allowNoFurbaby = false } = {}) {
  if (cleanCapacityBasis(basis) === "furbaby" && Number(furbabies) < 1 && !allowNoFurbaby) {
    return { error: "This event counts furbaby slots. Add at least one furbaby to continue." };
  }
  return { units: capacityUnits(basis, { humans, furbabies }) };
}

// These expressions use e for events and r for registrations. Keep this
// fallback for the brief period before an older deployment has read migration
// 033: the database column itself defaults to registration.
export const CAPACITY_UNITS_SQL = `CASE WHEN coalesce(e.capacity_basis, 'registration') = 'human' THEN coalesce(r.human_count, 1)
  WHEN coalesce(e.capacity_basis, 'registration') = 'furbaby' THEN coalesce(r.furbaby_count, 0)
  ELSE 1 END`;

export const CAPACITY_USED_SQL = `coalesce(sum(${CAPACITY_UNITS_SQL}), 0)::int`;

export const CAPACITY_USED_AGGREGATE_SQL = `coalesce(sum(${CAPACITY_UNITS_SQL}) FILTER (WHERE r.id IS NOT NULL AND r.status = 'confirmed' AND r.deleted_at IS NULL AND (r.fee_status <> 'waiting' OR r.hold_expires_at IS NULL OR r.hold_expires_at > now())), 0)::int`;

/**
 * "Most hoomans from public RSVPs" (events.max_public_humans, migration 046): a
 * people limit next to the dog/registration capacity. It counts hoomans on
 * confirmed public RSVPs (not ones an admin added by hand, e.g. VIPs and
 * organizers), with expired payment holds left out. Over it, a new RSVP goes
 * on the waitlist, as with capacity.
 */
export function cleanHoomanLimit(value) {
  const n = Number(value);
  if (value === "" || value == null || !Number.isInteger(n) || n < 1) return null;
  return Math.min(n, 10000);
}

export function hoomanLimitFits({ limit, used = 0, requested = 1 }) {
  if (!limit) return true;
  return Number(used) + Number(requested) <= Number(limit);
}

/** Hoomans on confirmed public RSVPs (`r` registrations), for the limit above. */
export const PUBLIC_HUMANS_USED_SQL = `coalesce(sum(CASE WHEN r.added_by IS NULL THEN coalesce(r.human_count, 1) ELSE 0 END), 0)::int`;
