import { manilaToday } from "./publicEvents";
import { cleanPromoCodes, findPromo, normalizeCode, promoProblem } from "./promoCodes.mjs";

/**
 * Registrations that count as a use of a code: confirmed, not deleted, and not an
 * unpaid hold that has run out (same rule as capacity), so unpaid RSVPs can't use it up.
 */
export const PROMO_USED_WHERE = `deleted_at IS NULL AND status = 'confirmed'
  AND (fee_status <> 'waiting' OR hold_expires_at IS NULL OR hold_expires_at > now())`;
const USES_SQL = `SELECT count(*)::int AS used FROM registrations
  WHERE event_id = $1 AND promo->>'code' = $2 AND ${PROMO_USED_WHERE}`;

/**
 * Checks a typed code against an event's promo codes (period and uses left).
 * Pass `db` = the transaction (with the event row locked) when saving, so the
 * last use can't be taken twice. Returns { promo } or { error }.
 */
export async function checkPromo(db, eventId, promoCodes, typed) {
  const promo = findPromo(cleanPromoCodes(promoCodes).codes || [], typed);
  if (!promo) return { error: promoProblem(null) };
  const [{ used }] = await db.sql(USES_SQL, [eventId, normalizeCode(promo.code)]);
  const error = promoProblem(promo, { today: manilaToday(), used });
  return error ? { error } : { promo };
}
