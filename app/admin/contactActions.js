"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { cleanContact } from "../lib/contacts.mjs";
import { pictureFrom } from "../lib/admin/imageUpload";

const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const fields = (data) => Object.fromEntries(["category", "name", "organization", "email", "phone", "handle", "address", "salutation", "notes", "repName", "repEmail", "repPhone", "sendTo"].map((k) => [k, form(data, k)]));

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** Guest list: add or update one contact. */
export async function saveContact(data) {
  const id = form(data, "id");
  // From an event's guest list: the new guest joins that event, and every step goes back there.
  const eventId = isUuid(form(data, "event")) ? form(data, "event") : null;
  const eventBack = eventId ? `/events/${eventId}/guests` : null;
  const back = eventBack || (isUuid(id) ? `/guests/${id}` : "/guests");
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const { contact: c, error } = cleanContact(fields(data));
    if (error) await backWith(back, "error", error);
    const photo = await pictureFrom(data, "photo", admin.email);
    const logo = await pictureFrom(data, "logo", admin.email);
    if (photo.error || logo.error) await backWith(back, "error", photo.error || logo.error);
    if (isUuid(id)) {
      await sql(
        `UPDATE letter_contacts SET category=$2, name=$3, organization=$4, email=$5, phone=$6, handle=$7, notes=$8, address=$9, salutation=$10, photo=$11, logo=$12, rep_name=$13, rep_email=$14, rep_phone=$15, send_to=$16, updated_at=now()
          WHERE id=$1 AND deleted_at IS NULL`,
        [id, c.category, c.name, c.organization, c.email, c.phone, c.handle, c.notes, c.address, c.salutation, photo.url, logo.url, c.repName, c.repEmail, c.repPhone, c.sendTo],
      );
      await logActivity(admin.email, "contact.update", c.name, { contactId: id });
      await backWith(eventBack || `/guests?category=${c.category}`, "ok", `Saved ${c.name}.`);
    }
    const [dupe] = await sql("SELECT id FROM letter_contacts WHERE deleted_at IS NULL AND lower(name)=lower($1) AND category=$2", [c.name, c.category]);
    if (dupe && !eventId) await backWith(`/guests?category=${c.category}`, "error", `${c.name} is already in this category.`);
    if (dupe) {
      // Already a guest from another event: add that same person to this event.
      await sql("INSERT INTO event_guests (event_id, contact_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [eventId, dupe.id, admin.email]);
      await backWith(eventBack, "ok", `${c.name} was already in your guests; added them to this event.`);
    }
    const [row] = await sql(
      `INSERT INTO letter_contacts (category, name, organization, email, phone, handle, notes, created_by, address, salutation, photo, logo, rep_name, rep_email, rep_phone, send_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [c.category, c.name, c.organization, c.email, c.phone, c.handle, c.notes, admin.email, c.address, c.salutation, photo.url, logo.url, c.repName, c.repEmail, c.repPhone, c.sendTo],
    );
    if (eventId) await sql("INSERT INTO event_guests (event_id, contact_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [eventId, row.id, admin.email]);
    await logActivity(admin.email, "contact.add", c.name, { category: c.category, contactId: row.id, ...(eventId ? { eventId } : {}) });
    await backWith(eventBack || `/guests?category=${c.category}`, "ok", `Added ${c.name}${eventId ? " to this event's guest list" : ""}.`);
  });
}

/** Guest list: remove a contact (kept in the database, hidden from the list). */
export async function removeContact(data) {
  const id = form(data, "id");
  return guarded("/guests", async () => {
    const admin = await actionAdmin("guests:edit");
    if (!isUuid(id)) await backWith("/guests", "error", "That contact wasn't found.");
    const [row] = await sql("UPDATE letter_contacts SET deleted_at=now() WHERE id=$1 AND deleted_at IS NULL RETURNING name", [id]);
    if (row) await logActivity(admin.email, "contact.remove", row.name, { contactId: id });
    await backWith("/guests", "ok", row ? `Removed ${row.name}.` : "Already removed.");
  });
}

/** An event's guest list: add people from earlier guest lists. Nothing is emailed. */
export async function addGuestsToEvent(data) {
  const eventId = form(data, "event");
  const back = isUuid(eventId) ? `/events/${eventId}/guests` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const [event] = isUuid(eventId) ? await sql("SELECT id, title FROM events WHERE id = $1", [eventId]) : [];
    if (!event) await backWith("/events", "error", "That event wasn't found.");
    const ids = [...new Set(data.getAll("contact").filter(isUuid))];
    if (!ids.length) await backWith(back, "error", "Tick at least one person to add.");
    const added = await sql(
      `INSERT INTO event_guests (event_id, contact_id, added_by)
       SELECT $1, c.id, $3 FROM letter_contacts c WHERE c.id = ANY($2::uuid[]) AND c.deleted_at IS NULL
       ON CONFLICT DO NOTHING RETURNING contact_id`,
      [event.id, ids, admin.email],
    );
    if (added.length) await logActivity(admin.email, "event.guest.add", event.title, { eventId: event.id, added: added.length });
    await backWith(back, "ok", `Added ${added.length} guest${added.length === 1 ? "" : "s"} to this event. Nothing was emailed.`);
  });
}

/** An event's guest list: save one guest's reply and notes for this event. */
export async function saveEventGuest(data) {
  const eventId = form(data, "event");
  const back = isUuid(eventId) ? `/events/${eventId}/guests` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const contactId = form(data, "contact");
    const reply = ["waiting", "yes", "no"].includes(form(data, "reply")) ? form(data, "reply") : "waiting";
    const notes = form(data, "notes").trim().slice(0, 1000) || null;
    const [row] = isUuid(eventId) && isUuid(contactId)
      ? await sql("UPDATE event_guests SET reply=$3, notes=$4, updated_at=now() WHERE event_id=$1 AND contact_id=$2 RETURNING contact_id", [eventId, contactId, reply, notes])
      : [];
    if (!row) await backWith(back, "error", "That guest isn't on this event's list.");
    const [c] = await sql("SELECT name FROM letter_contacts WHERE id = $1", [contactId]);
    await logActivity(admin.email, "event.guest.save", c?.name || "", { eventId, contactId, reply });
    await backWith(back, "ok", `Saved ${c?.name}.`);
  });
}

/** An event's guest list: take someone off this event (they stay available for other events). */
export async function removeEventGuest(data) {
  const eventId = form(data, "event");
  const back = isUuid(eventId) ? `/events/${eventId}/guests` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const contactId = form(data, "contact");
    const gone = isUuid(eventId) && isUuid(contactId) ? await sql("DELETE FROM event_guests WHERE event_id=$1 AND contact_id=$2 RETURNING contact_id", [eventId, contactId]) : [];
    if (gone.length) await logActivity(admin.email, "event.guest.remove", "", { eventId, contactId });
    await backWith(back, "ok", gone.length ? "Taken off this event's guest list." : "Already off the list.");
  });
}
