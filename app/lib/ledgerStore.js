import { sql } from "./db";
import { ledgerLines } from "./ledger.mjs";

/**
 * The ledger's lines from every source (owner, 22 Nov 2026): the treasurer's own lines, paid registration fees
 * net of refunds, cash donations and pledges from each event's Donors page, and Yes brands' cash and in-kind
 * from its Brand tracker. `scope` is an event id, "general" (lines not tied to an event) or "all".
 */
export async function loadLedger(scope = "all") {
  const isEvent = /^[0-9a-f-]{36}$/i.test(String(scope));
  const general = scope === "general";
  const byEvent = (col) => (isEvent ? `AND ${col} = $1` : general ? "AND false" : "");
  const params = isEvent ? [scope] : [];
  const [entries, fees, donations, brands, events, beneficiaries] = await Promise.all([
    sql(
      `SELECT le.*, b.name AS beneficiary_name,
              (SELECT count(*) FROM ledger_files f WHERE f.entry_id = le.id)::int AS files
         FROM ledger_entries le LEFT JOIN beneficiaries b ON b.id = le.beneficiary_id
        WHERE le.deleted_at IS NULL ${isEvent ? "AND le.event_id = $1" : general ? "AND le.event_id IS NULL" : ""}
        ORDER BY le.entry_date, le.created_at`,
      params,
    ),
    sql(
      `SELECT r.event_id, e.date, count(*)::int AS count,
              sum(COALESCE(r.pay_amount, r.amount_due, r.ticket_amount, 0)) - sum(COALESCE(r.refund_amount, 0)) AS amount,
              sum(COALESCE(r.refund_amount, 0)) AS refunded
         FROM registrations r JOIN events e ON e.id = r.event_id
        WHERE r.fee_status = 'paid' AND r.deleted_at IS NULL ${byEvent("r.event_id")}
        GROUP BY r.event_id, e.date`,
      params,
    ),
    sql(
      `SELECT ed.event_id, ed.contact_id, ed.status, ed.amount, ed.method, ed.reference, ed.received_on, ed.acknowledge,
              ed.public_name, ed.verified_at, c.name, e.date,
              (SELECT count(*) FROM donation_files f WHERE f.event_id = ed.event_id AND f.contact_id = ed.contact_id AND f.kind = 'proof')::int AS proofs
         FROM event_donors ed JOIN letter_contacts c ON c.id = ed.contact_id JOIN events e ON e.id = ed.event_id
        WHERE ed.amount > 0 AND ed.status IN ('pledged', 'received', 'receipt_sent') ${byEvent("ed.event_id")}`,
      params,
    ),
    sql(
      `SELECT eb.event_id, eb.supporter_id, eb.role, eb.reply, eb.cash_amount, eb.in_kind_value, eb.in_kind_note, eb.show_amounts,
              s.name, e.date
         FROM event_brands eb JOIN supporters s ON s.id = eb.supporter_id JOIN events e ON e.id = eb.event_id
        WHERE eb.reply = 'yes' AND (eb.cash_amount > 0 OR eb.in_kind_value > 0 OR eb.in_kind_note IS NOT NULL) ${byEvent("eb.event_id")}`,
      params,
    ),
    sql("SELECT id, title, date, status FROM events ORDER BY date DESC NULLS LAST, title"),
    sql("SELECT id, name FROM beneficiaries WHERE deleted_at IS NULL ORDER BY lower(name)"),
  ]);
  const files = entries.length
    ? await sql("SELECT id, entry_id, mime, name, size, created_at FROM ledger_files WHERE entry_id = ANY($1::uuid[]) ORDER BY created_at", [entries.map((e) => e.id)])
    : [];
  const lines = ledgerLines({ entries, fees, donations, brands });
  return { lines, entries, files: files.map((f) => ({ ...f, created_at: String(f.created_at) })), events, beneficiaries };
}

/** Lines removed from the ledger (newest first), so they can be restored. Same scopes as loadLedger. */
export async function loadRemovedLedger(scope = "all") {
  const isEvent = /^[0-9a-f-]{36}$/i.test(String(scope));
  const general = scope === "general";
  return sql(
    `SELECT le.*, b.name AS beneficiary_name, (SELECT count(*) FROM ledger_files f WHERE f.entry_id = le.id)::int AS files
       FROM ledger_entries le LEFT JOIN beneficiaries b ON b.id = le.beneficiary_id
      WHERE le.deleted_at IS NOT NULL ${isEvent ? "AND le.event_id = $1" : general ? "AND le.event_id IS NULL" : ""}
      ORDER BY le.deleted_at DESC LIMIT 100`,
    isEvent ? [scope] : [],
  );
}
