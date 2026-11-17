import { transaction } from "./db";
import { compTicket } from "./compTickets.mjs";
import { letterEmails } from "./contacts.mjs";
import { newCheckInCode } from "./admin/registrations.mjs";
import { compTypeForGuest, rsvpChange } from "./guestRsvp.mjs";

const SAME_NAME = "lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(trim($2), '[[:space:]]+', ' ', 'g'))";

/**
 * Keep the RSVP list in step with a guest's reply (owner, 2026-11-17). Coming: they're on the event's registrations
 * once, as a complimentary Guest or VIP (no fee, outside capacity, nothing emailed); a registration with the same
 * name (their own RSVP, or one added by hand) is linked instead of adding a second. Away from Coming: only the one
 * the tracker made is cancelled, and never after check-in. Runs under the event row lock, like every RSVP.
 * Returns a short sentence for the page's notice, or "".
 */
export async function syncGuestRsvp({ eventId, contactId, reply, adminEmail }) {
  return transaction(async (tx) => {
    await tx.sql("SELECT id FROM events WHERE id = $1 FOR UPDATE", [eventId]);
    const [g] = await tx.sql(
      `SELECT eg.registration_id, eg.registration_made, c.name, c.email, c.rep_email, c.send_to, c.category, c.specification
         FROM event_guests eg JOIN letter_contacts c ON c.id = eg.contact_id WHERE eg.event_id = $1 AND eg.contact_id = $2`,
      [eventId, contactId],
    );
    if (!g) return "";
    const [linked] = g.registration_id
      ? await tx.sql("SELECT id, status, deleted_at, checked_in_at, comp_type FROM registrations WHERE id = $1", [g.registration_id])
      : [];
    const [sameName] = reply === "yes"
      ? await tx.sql(`SELECT id, status, comp_type FROM registrations WHERE event_id = $1 AND deleted_at IS NULL AND status <> 'cancelled' AND ${SAME_NAME}
                       ORDER BY (comp_type IS NULL), created_at LIMIT 1`, [eventId, g.name])
      : [];
    const change = rsvpChange({ reply, linked: linked || null, made: g.registration_made, sameName: sameName || null });
    const link = (id, made) => tx.sql("UPDATE event_guests SET registration_id = $3, registration_made = $4 WHERE event_id = $1 AND contact_id = $2", [eventId, contactId, id, made]);

    if (change.op === "link") {
      await link(change.id, false);
      return `${g.name} was already on the RSVP list, so they weren't added twice.`;
    }
    if (change.op === "restore") {
      await tx.sql("UPDATE registrations SET status = 'confirmed' WHERE id = $1", [change.id]);
      return `${g.name} is back on the RSVP list.`;
    }
    if (change.op === "cancel") {
      await tx.sql("UPDATE registrations SET status = 'cancelled' WHERE id = $1", [change.id]);
      return `Their complimentary RSVP was cancelled.`;
    }
    if (change.op === "create") {
      const comp = compTypeForGuest(g);
      const ticket = compTicket(comp);
      const [row] = await tx.sql(
        `INSERT INTO registrations (event_id, name, email, photo_consent, under_18, status, fee_status, check_in_code,
           ticket_label, ticket_amount, human_count, furbaby_count, amount_due, added_by, comp_type)
         VALUES ($1, $2, $3, 'no', false, 'confirmed', 'not_due', $4, $5, 0, 1, 0, 0, $6, $7) RETURNING id`,
        [eventId, g.name, letterEmails(g).to || "", newCheckInCode(), ticket.label, adminEmail, comp],
      );
      await link(row.id, true);
      return `${g.name} is on the RSVP list as a complimentary ${ticket.label}.`;
    }
    return "";
  });
}
