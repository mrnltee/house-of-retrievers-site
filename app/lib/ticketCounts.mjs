import { tierKey } from "./prices.mjs";

/**
 * How many registrations hold each ticket, for tiers limited to the first N
 * registrants. For human + dog companion pricing, each human uses one unit.
 * Cancelled ones don't count (their place frees up); pending payments and the
 * waitlist do. Keys match tierKey() ("Early bird|650").
 */
export const TICKET_COUNTS_SQL = `SELECT coalesce(r.ticket_label, '') AS label, r.ticket_amount AS amount,
  sum(CASE WHEN e.pricing_basis = 'human_plus_furbaby' THEN coalesce(r.human_count, 1) ELSE 1 END)::int AS n
  FROM registrations r JOIN events e ON e.id = r.event_id
  WHERE r.event_id = $1 AND r.status <> 'cancelled' AND r.deleted_at IS NULL GROUP BY 1, 2`;

/** The same counts as a JSON column on an events query (`e` is the event). */
export const TICKET_COUNTS_COLUMN = `(SELECT json_object_agg(x.k, x.n) FROM (
    SELECT coalesce(r.ticket_label, '') || '|' || coalesce(r.ticket_amount::text, '') AS k,
      sum(CASE WHEN e.pricing_basis = 'human_plus_furbaby' THEN coalesce(r.human_count, 1) ELSE 1 END)::int AS n
      FROM registrations r WHERE r.event_id = e.id AND r.status <> 'cancelled' AND r.deleted_at IS NULL AND r.ticket_amount IS NOT NULL GROUP BY 1
  ) x) AS ticket_counts`;

/** Rows from TICKET_COUNTS_SQL → { tierKey: n }. */
export function countsFromRows(rows) {
  const counts = {};
  for (const row of rows || []) if (row.amount != null) counts[tierKey({ label: row.label, amount: row.amount })] = row.n;
  return counts;
}

/** Whether any tier is limited (only then is counting worth a query). */
export const hasLimits = (tiers) => (tiers || []).some((t) => t.limit);
