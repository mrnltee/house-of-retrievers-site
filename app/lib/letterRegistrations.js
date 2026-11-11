import { sql } from "./db";
import { reminderEligibility } from "./eventReminders.mjs";
import { furbabyCardLine } from "./invitationCard.mjs";
import { can } from "./admin/roles.mjs";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

/**
 * Registered participants as letter recipients ("registration:<id>"; owner,
 * 2026-11-11, for invitation cards). Only those with a confirmed spot (and, on a
 * paid event, confirmed payment) and an email, as for event reminders
 * (reminderEligibility). Greeted by their name; their card line is their furbabies.
 */
export async function registrationRecipients(ids, { eventId, admin } = {}) {
  const wanted = [...new Set(ids)].filter(isUuid);
  // Only for admins who may see registrations, and only the send's own event's participants.
  if (!wanted.length || !isUuid(eventId) || !admin || !can(admin, "registrations:view")) return [];
  const rows = await sql(
    `SELECT r.id, r.name, r.email, r.furbaby_name, r.status, r.fee_status, r.deleted_at, e.fee_required
       FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE r.id = ANY($1::uuid[]) AND r.event_id = $2 ORDER BY r.name`,
    [wanted, eventId],
  );
  return rows
    .filter((r) => reminderEligibility(r, { feeRequired: Boolean(r.fee_required) }).ok)
    .map((r) => {
      const name = String(r.name || "").trim();
      return { ref: `registration:${r.id}`, id: r.id, type: "registration", name, contact: "", address: "", salutation: name, cardLine: furbabyCardLine(r.furbaby_name), email: String(r.email || "").trim() };
    });
}

/**
 * The check-in codes of participants in this send, for the QR on their
 * invitation's last page: id → { code, comp } (comp: their complimentary type, for the gold QR). Server-side only (never sent to the
 * browser), with the same event and eligibility checks as above. A pass code
 * is as good as the pass, so it needs registrations:edit, the right that shows
 * a pass link on the registration page.
 */
export async function passCodes(ids, { eventId, admin } = {}) {
  const wanted = [...new Set(ids)].filter(isUuid);
  if (!wanted.length || !isUuid(eventId) || !admin || !can(admin, "registrations:view") || !can(admin, "registrations:edit")) return new Map();
  const rows = await sql(
    `SELECT r.id, r.check_in_code, r.comp_type, r.email, r.status, r.fee_status, r.deleted_at, e.fee_required
       FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE r.id = ANY($1::uuid[]) AND r.event_id = $2`,
    [wanted, eventId],
  );
  return new Map(rows.filter((r) => r.check_in_code && reminderEligibility(r, { feeRequired: Boolean(r.fee_required) }).ok).map((r) => [r.id, { code: r.check_in_code, comp: r.comp_type }]));
}

/**
 * Every confirmed participant of an event who can be sent a letter (paid on a
 * paid event; reminderEligibility), as registration ids, for the send window's
 * "participants=all". Same permission check as registrationRecipients.
 */
export async function eventParticipantIds(eventId, { admin } = {}) {
  if (!isUuid(eventId) || !admin || !can(admin, "registrations:view")) return [];
  const rows = await sql(
    `SELECT r.id, r.email, r.status, r.fee_status, r.deleted_at, e.fee_required
       FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE r.event_id = $1 AND r.deleted_at IS NULL AND r.status = 'confirmed' ORDER BY lower(r.name)`,
    [eventId],
  );
  return rows.filter((r) => reminderEligibility(r, { feeRequired: Boolean(r.fee_required) }).ok).map((r) => r.id);
}
