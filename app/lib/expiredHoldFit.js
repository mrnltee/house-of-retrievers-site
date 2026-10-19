import { eventTiers } from "./admin/events.mjs";
import { CAPACITY_USED_SQL, PUBLIC_HUMANS_USED_SQL, hoomanLimitFits, validateCapacityCounts } from "./eventCapacity.mjs";
import { tierLeft } from "./prices.mjs";
import { ACTIVE_REGISTRATION_SQL, lateProofFits } from "./registrationHolds.mjs";
import { ticketLimitUnits } from "./registrationPricing.mjs";
import { TICKET_COUNTS_SQL, countsFromRows } from "./ticketCounts.mjs";

/**
 * Whether a registration whose payment hold expired still fits the event right
 * now: its capacity units, its ticket's first-N units and (for a public RSVP)
 * the event's "Most hoomans from public RSVPs". Used for a late receipt and for
 * "Send payment reminder". Call inside a transaction after locking the event row
 * (`SELECT … FROM events WHERE id=$1 FOR UPDATE`). `reg` needs the registration
 * plus the event's capacity, capacity_basis, pricing_basis, price_tiers, cost and
 * max_public_humans.
 */
export async function expiredHoldFits(tx, reg) {
  const capacityRequest = validateCapacityCounts(reg.capacity_basis, reg.human_count, reg.furbaby_count, { allowNoFurbaby: true });
  if (capacityRequest.error) return false;
  const [{ used, humansUsed }] = await tx.sql(
    `SELECT ${CAPACITY_USED_SQL} AS used, ${PUBLIC_HUMANS_USED_SQL} AS "humansUsed" FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE r.event_id=$1 AND r.id<>$2 AND r.status='confirmed' AND r.deleted_at IS NULL AND ${ACTIVE_REGISTRATION_SQL}`,
    [reg.event_id, reg.id],
  );
  let tierLimit = null;
  let tierLeftCount = null;
  let tierUnits = 0;
  const selectedTier = eventTiers(reg).find((t) => t.label === reg.ticket_label && Number(t.amount) === Number(reg.ticket_amount));
  if (selectedTier?.limit) {
    const counts = countsFromRows(await tx.sql(TICKET_COUNTS_SQL, [reg.event_id]));
    tierLimit = selectedTier.limit;
    tierLeftCount = tierLeft(selectedTier, counts);
    tierUnits = ticketLimitUnits(reg.pricing_basis, selectedTier, reg.human_count ?? 1, reg.furbaby_count ?? 0);
  }
  if (!lateProofFits({ capacity: reg.capacity, capacityUsed: Number(used || 0), capacityUnits: capacityRequest.units, tierLimit, tierLeft: tierLeftCount, tierUnits })) return false;
  if (!reg.added_by && !hoomanLimitFits({ limit: reg.max_public_humans, used: humansUsed, requested: reg.human_count ?? 1 })) return false;
  return true;
}
