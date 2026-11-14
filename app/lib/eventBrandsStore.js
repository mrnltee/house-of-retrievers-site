import { sql } from "./db";

/** One event's Brand tracker: invited brands with their directory details. Waiting first, then Yes, then No. */
export function trackerRows(eventId) {
  return sql(
    `SELECT eb.*, s.name, s.slug, s.logo, s.kind, s.contact_name, s.contact_email, s.salutation, s.greeting, s.code, s.number_no
       FROM event_brands eb JOIN supporters s ON s.id = eb.supporter_id
      WHERE eb.event_id = $1
      ORDER BY array_position(ARRAY['waiting','yes','no'], eb.reply), lower(s.name)`,
    [eventId],
  );
}

/** Invites directory brands to an event (role = their usual kind). Already-invited ones are left as they are. */
export async function inviteBrands(eventId, supporterIds, by) {
  if (!supporterIds?.length) return { added: 0, already: 0 };
  const rows = await sql(
    `INSERT INTO event_brands (event_id, supporter_id, role, added_by)
     SELECT $1, s.id, s.kind, $3 FROM supporters s WHERE s.id = ANY($2::uuid[])
     ON CONFLICT (event_id, supporter_id) DO NOTHING RETURNING supporter_id`,
    [eventId, supporterIds, by],
  );
  return { added: rows.length, already: supporterIds.length - rows.length };
}

/** Saves one tracker row (value from cleanEventBrand). Returns the row as it was before, or null. */
export async function saveTrackerRow(eventId, supporterId, v, db = { sql }) {
  const [before] = await db.sql("SELECT reply FROM event_brands WHERE event_id = $1 AND supporter_id = $2", [eventId, supporterId]);
  if (!before) return null;
  await db.sql(
    `UPDATE event_brands SET role=$3, reply=$4, follow_up_on=$5, gives=$6, cash_amount=$7, in_kind_value=$8, in_kind_note=$9,
       booth_needs=$10, reps_attending=$11, dogs_attending=$12, show_amounts=$13, notes=$14,
       replied_at = CASE WHEN $4 <> reply AND $4 <> 'waiting' THEN now() ELSE replied_at END, updated_at = now()
     WHERE event_id = $1 AND supporter_id = $2`,
    [eventId, supporterId, v.role, v.reply, v.followUpOn, v.gives, v.cashAmount, v.inKindValue, v.inKindNote, v.boothNeeds, v.repsAttending, v.dogsAttending, v.showAmounts, v.notes],
  );
  return before;
}

export function removeFromTracker(eventId, supporterId) {
  return sql("DELETE FROM event_brands WHERE event_id = $1 AND supporter_id = $2 RETURNING supporter_id", [eventId, supporterId]);
}

/** { eventId → [{ supporterId, name, slug, logo, role }] } brands that said Yes. */
export async function yesBrandsByEvent(eventIds) {
  if (!eventIds?.length) return {};
  const rows = await sql(
    `SELECT eb.event_id, eb.role, s.id AS supporter_id, s.name, s.slug, s.logo
       FROM event_brands eb JOIN supporters s ON s.id = eb.supporter_id
      WHERE eb.event_id = ANY($1::uuid[]) AND eb.reply = 'yes' ORDER BY lower(s.name)`,
    [eventIds],
  );
  const out = {};
  for (const r of rows) (out[r.event_id] ||= []).push({ supporterId: r.supporter_id, name: r.name, slug: r.slug, logo: r.logo, role: r.role });
  return out;
}

/** Every event a brand was invited to, newest first. */
export function brandHistory(supporterId) {
  return sql(
    `SELECT eb.event_id, e.title, e.date, e.status, eb.role, eb.reply, eb.gives, eb.cash_amount, eb.in_kind_value
       FROM event_brands eb JOIN events e ON e.id = eb.event_id
      WHERE eb.supporter_id = $1 ORDER BY e.date DESC NULLS LAST`,
    [supporterId],
  );
}

/** { supporterId → number of published events they said Yes to }. */
export async function joinedCounts() {
  const rows = await sql(
    `SELECT eb.supporter_id, count(*)::int AS n FROM event_brands eb JOIN events e ON e.id = eb.event_id
      WHERE eb.reply = 'yes' AND e.status = 'published' GROUP BY eb.supporter_id`,
  );
  return Object.fromEntries(rows.map((r) => [r.supporter_id, r.n]));
}

/** Events a brand isn't on yet (any status, upcoming or past), for "Add to events". No brand = every event. */
export function eventsForBrand(supporterId = null) {
  return sql(
    `SELECT e.id, e.title, e.date, e.status FROM events e
      WHERE $1::uuid IS NULL OR NOT EXISTS (SELECT 1 FROM event_brands eb WHERE eb.event_id = e.id AND eb.supporter_id = $1)
      ORDER BY e.date`,
    [supporterId],
  );
}

/**
 * Puts one brand on several events' Brand trackers with the same reply
 * (role = their usual kind). Events it's already on are left as they are.
 * Returns the titles of the events it was added to.
 */
export async function addBrandToEvents(supporterId, eventIds, reply, by) {
  if (!eventIds?.length) return [];
  const rows = await sql(
    `INSERT INTO event_brands (event_id, supporter_id, role, reply, replied_at, added_by)
     SELECT e.id, s.id, s.kind, $3, CASE WHEN $3 <> 'waiting' THEN now() END, $4
       FROM events e, supporters s WHERE e.id = ANY($2::uuid[]) AND s.id = $1
     ON CONFLICT (event_id, supporter_id) DO NOTHING RETURNING event_id`,
    [supporterId, eventIds, reply, by],
  );
  if (!rows.length) return [];
  const titles = await sql("SELECT id, title FROM events WHERE id = ANY($1::uuid[]) ORDER BY date", [rows.map((r) => r.event_id)]);
  return titles;
}
