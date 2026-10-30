import { manilaToday } from "./publicEvents";
import { cleanPromoCodes, findPromo, normalizeCode, promoProblem } from "./promoCodes.mjs";

/** Registrations that count as a use of a code: not deleted, not cancelled. */
const USES_SQL = `SELECT count(*)::int AS used FROM registrations
  WHERE event_id = $1 AND promo->>'code' = $2 AND deleted_at IS NULL AND status <> 'cancelled'`;

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
