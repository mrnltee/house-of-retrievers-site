import { sql } from "./db";
import { sendEmail } from "./email";
import { loadCustomTemplate, loadTemplate } from "./emailSettings";
import { receiptRejected, rsvpConfirmed, spotHeld } from "./emailTemplates.mjs";
import { EVENTS_URL } from "./eventsHost.mjs";
import { payMethodLabel, ticketLine } from "./eventPayments.mjs";

/**
 * The emails a registration gets, built from the database row so the RSVP
 * route and the admin send exactly the same thing. Each returns sendEmail's
 * result ({ ok, skipped }) and never throws.
 */

async function load(registrationId) {
  const [row] = await sql(
    `SELECT r.id, r.name, r.email, r.status, r.check_in_code, r.ticket_label, r.ticket_amount, r.amount_due, r.pay_method, r.pay_amount, r.fee_reference, r.fee_note,
            e.title, e.date, e.start_time, e.end_time, e.all_day, e.venue, e.city, e.email_template_id
       FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = $1 AND r.deleted_at IS NULL`,
    [registrationId],
  );
  return row || null;
}

const eventOf = (row) => ({
  title: row.title,
  date: String(row.date).slice(0, 10),
  startTime: row.start_time || undefined,
  endTime: row.end_time || undefined,
  allDay: Boolean(row.all_day),
  venue: row.venue,
  city: row.city,
});
const passUrl = (row) => `${EVENTS_URL}/r/${row.check_in_code}`;

/** "GCash · Ref 1012 345 678 901 · ₱795" */
export function paidLine(row) {
  const amount = row.pay_amount ?? row.amount_due ?? row.ticket_amount;
  return [payMethodLabel(row.pay_method), row.fee_reference ? `Ref ${row.fee_reference}` : "", amount ? `₱${Number(amount).toLocaleString("en-PH")}` : ""].filter(Boolean).join(" · ");
}

async function safeSend(args) {
  try {
    return await sendEmail(args);
  } catch {
    return { ok: false };
  }
}

/**
 * The pass with the check-in QR. `paid` adds the line about the matched
 * payment. `again` makes a fresh send (a resend) instead of a no-op repeat.
 */
export async function sendPass(registrationId, { paid = false, again = false } = {}) {
  const row = await load(registrationId);
  if (!row || row.status !== "confirmed") return { ok: false };
  const own = row.email_template_id ? await loadCustomTemplate(row.email_template_id, "event") : null;
  const custom = own || (await loadTemplate("rsvp-confirmed"));
  const mail = rsvpConfirmed({
    name: row.name,
    event: eventOf(row),
    status: "confirmed",
    passUrl: passUrl(row),
    code: row.check_in_code,
    paidLine: paid ? paidLine(row) : "",
    custom,
    ref: own ? "custom:event" : "rsvp-confirmed",
  });
  const sent = await safeSend({ to: row.email, ...mail, idempotencyKey: again ? `pass/${row.check_in_code}/${Date.now()}` : `pass/${row.check_in_code}` });
  if (sent.ok) await sql("UPDATE registrations SET pass_sent_at = now() WHERE id = $1", [registrationId]).catch(() => null);
  return sent;
}

/** Paid event, straight after the RSVP: the spot is held, here's how to pay. */
export async function sendSpotHeld(registrationId) {
  const row = await load(registrationId);
  if (!row) return { ok: false };
  const mail = spotHeld({ name: row.name, event: eventOf(row), passUrl: passUrl(row), ticket: ticketLine(row.ticket_label, row.amount_due ?? row.ticket_amount) });
  return safeSend({ to: row.email, ...mail, idempotencyKey: `held/${row.check_in_code}` });
}

/** Waitlist note (fixed wording). */
export async function sendWaitlisted(registrationId) {
  const row = await load(registrationId);
  if (!row) return { ok: false };
  const mail = rsvpConfirmed({ name: row.name, event: eventOf(row), status: "waitlist", passUrl: passUrl(row) });
  return safeSend({ to: row.email, ...mail, idempotencyKey: `rsvp/${row.check_in_code}` });
}

/** An admin asked for a new receipt; the reason is in fee_note. */
export async function sendReceiptRejected(registrationId) {
  const row = await load(registrationId);
  if (!row) return { ok: false };
  const mail = receiptRejected({ name: row.name, event: eventOf(row), passUrl: passUrl(row), reason: row.fee_note || "We couldn't match this receipt." });
  return safeSend({ to: row.email, ...mail, idempotencyKey: `rejected/${row.check_in_code}/${Date.now()}` });
}
