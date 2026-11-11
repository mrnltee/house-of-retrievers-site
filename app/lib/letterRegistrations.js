import { sql } from "./db";
import { reminderEligibility } from "./eventReminders.mjs";
import { furbabyCardLine } from "./invitationCard.mjs";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

/**
 * Registered participants as letter recipients ("registration:<id>"; owner,
 * 2026-11-11, for invitation cards). Only those with a confirmed spot (and, on a
 * paid event, confirmed payment) and an email, as for event reminders
 * (reminderEligibility). Greeted by their name; their card line is their furbabies.
 */
export async function registrationRecipients(ids) {
  const wanted = [...new Set(ids)].filter(isUuid);
  if (!wanted.length) return [];
  const rows = await sql(
    `SELECT r.id, r.name, r.email, r.furbaby_name, r.status, r.fee_status, r.deleted_at, e.fee_required
       FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE r.id = ANY($1::uuid[]) ORDER BY r.name`,
    [wanted],
  );
  return rows
    .filter((r) => reminderEligibility(r, { feeRequired: Boolean(r.fee_required) }).ok)
    .map((r) => {
      const name = String(r.name || "").trim();
      return { ref: `registration:${r.id}`, id: r.id, type: "registration", name, contact: "", address: "", salutation: name, cardLine: furbabyCardLine(r.furbaby_name), email: String(r.email || "").trim() };
    });
}
