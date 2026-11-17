"use server";

import { syncGuestRsvp } from "../lib/guestRsvpStore";
import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { cleanContact } from "../lib/contacts.mjs";
import { cleanSpeaker } from "../lib/eventSpeakers.mjs";
import { cleanEventDonor } from "../lib/eventDonors.mjs";
import { pictureFrom } from "../lib/admin/imageUpload";

const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
// An event's guest list, or its donor list (owner, 2026-11-02): the same people, a different table.
const LISTS = {
  guests: { table: "event_guests", one: "guest", name: "guest list" },
  donors: { table: "event_donors", one: "donor", name: "donor list" },
};
const listOf = (data) => (form(data, "list") === "donors" ? "donors" : "guests");
const fields = (data) => Object.fromEntries(["category", "specification", "name", "organization", "email", "phone", "handle", "address", "salutation", "notes", "repName", "repEmail", "repPhone", "sendTo"].map((k) => [k, form(data, k)]));

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
  const list = listOf(data);
  const { table } = LISTS[list];
  const eventBack = eventId ? `/events/${eventId}/${list}` : null;
  const back = eventBack || (isUuid(id) ? `/guests/${id}` : "/guests");
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const { contact: c, error } = cleanContact(fields(data));
    if (error) await backWith(back, "error", error);
    const photo = await pictureFrom(data, "photo", admin.email, { private: true });
    const logo = await pictureFrom(data, "logo", admin.email, { private: true });
    if (photo.error || logo.error) await backWith(back, "error", photo.error || logo.error);
    if (isUuid(id)) {
      await sql(
        `UPDATE letter_contacts SET category=$2, name=$3, organization=$4, email=$5, phone=$6, handle=$7, notes=$8, address=$9, salutation=$10, photo=$11, logo=$12, rep_name=$13, rep_email=$14, rep_phone=$15, send_to=$16, specification=$17, updated_at=now()
          WHERE id=$1 AND deleted_at IS NULL`,
        [id, c.category, c.name, c.organization, c.email, c.phone, c.handle, c.notes, c.address, c.salutation, photo.url, logo.url, c.repName, c.repEmail, c.repPhone, c.sendTo, c.specification],
      );
      await logActivity(admin.email, "contact.update", c.name, { contactId: id });
      await backWith(eventBack || `/guests?category=${c.category}`, "ok", `Saved ${c.name}.`);
    }
    const [dupe] = await sql("SELECT id FROM letter_contacts WHERE deleted_at IS NULL AND lower(name)=lower($1) AND category=$2", [c.name, c.category]);
    if (dupe && !eventId) await backWith(`/guests?category=${c.category}`, "error", `${c.name} is already in this category.`);
    if (dupe) {
      // Already a guest from another event: add that same person to this event.
      await sql(`INSERT INTO ${table} (event_id, contact_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [eventId, dupe.id, admin.email]);
      await backWith(eventBack, "ok", `${c.name} was already in your guests; added them to this event.`);
    }
    const [row] = await sql(
      `INSERT INTO letter_contacts (category, name, organization, email, phone, handle, notes, created_by, address, salutation, photo, logo, rep_name, rep_email, rep_phone, send_to, specification) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [c.category, c.name, c.organization, c.email, c.phone, c.handle, c.notes, admin.email, c.address, c.salutation, photo.url, logo.url, c.repName, c.repEmail, c.repPhone, c.sendTo, c.specification],
    );
    if (eventId) await sql(`INSERT INTO ${table} (event_id, contact_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [eventId, row.id, admin.email]);
    await logActivity(admin.email, "contact.add", c.name, { category: c.category, contactId: row.id, ...(eventId ? { eventId } : {}) });
    await backWith(eventBack || `/guests?category=${c.category}`, "ok", `Added ${c.name}${eventId ? ` to this event's ${LISTS[list].name}` : ""}.`);
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

/** An event's guest or donor list: add people from earlier lists. Nothing is emailed. */
export async function addGuestsToEvent(data) {
  const eventId = form(data, "event");
  const list = listOf(data);
  const { table, one } = LISTS[list];
  const back = isUuid(eventId) ? `/events/${eventId}/${list}` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const [event] = isUuid(eventId) ? await sql("SELECT id, title FROM events WHERE id = $1", [eventId]) : [];
    if (!event) await backWith("/events", "error", "That event wasn't found.");
    const ids = [...new Set(data.getAll("contact").filter(isUuid))];
    if (!ids.length) await backWith(back, "error", "Tick at least one person to add.");
    const added = await sql(
      `INSERT INTO ${table} (event_id, contact_id, added_by)
       SELECT $1, c.id, $3 FROM letter_contacts c WHERE c.id = ANY($2::uuid[]) AND c.deleted_at IS NULL
       ON CONFLICT DO NOTHING RETURNING contact_id`,
      [event.id, ids, admin.email],
    );
    if (added.length) await logActivity(admin.email, `event.${one}.add`, event.title, { eventId: event.id, added: added.length });
    await backWith(back, "ok", `Added ${added.length} ${one}${added.length === 1 ? "" : "s"} to this event. Nothing was emailed.`);
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
    // "On the event page" (speakers & special guests). Only when the form sent it, so an older open tab
    // saving just the reply leaves these alone. The picture is public: it is uploaded for the page.
    let shown = null;
    if (form(data, "publicSent") === "1") {
      const pub = cleanSpeaker({ show: form(data, "showOnSite"), role: form(data, "publicRole"), intro: form(data, "publicIntro"), link: form(data, "publicLink") });
      if (form(data, "publicLink").trim() && !pub.link) await backWith(back, "error", "That link isn't one we can show. Use a full https:// address or an @handle.");
      const photo = await pictureFrom(data, "publicPhoto", admin.email);
      if (photo.error) await backWith(back, "error", photo.error);
      await sql("UPDATE event_guests SET show_on_site=$3, public_role=$4, public_intro=$5, public_link=$6, public_photo=$7 WHERE event_id=$1 AND contact_id=$2",
        [eventId, contactId, pub.show, pub.role || null, pub.intro || null, pub.link || null, photo.url]);
      shown = pub.show;
    }
    const [c] = await sql("SELECT name FROM letter_contacts WHERE id = $1", [contactId]);
    await logActivity(admin.email, "event.guest.save", c?.name || "", { eventId, contactId, reply, ...(shown === null ? {} : { onEventPage: shown }) });
    const note = shown && reply !== "yes" ? " They'll appear on the event page once their reply is Coming." : "";
    const rsvp = await syncGuestRsvp({ eventId, contactId, reply, adminEmail: admin.email });
    if (rsvp) await logActivity(admin.email, "event.guest.rsvp", c?.name || "", { eventId, contactId, reply });
    await backWith(back, "ok", `Saved ${c?.name}.${note}${rsvp ? ` ${rsvp}` : ""}`);
  });
}

/**
 * Guest tracker quick reply (owner, 17 Nov 2026): set only this guest's reply from the row, without opening Edit.
 * Notes and "On the event page" are left as they are.
 */
export async function setEventGuestReply(data) {
  const eventId = form(data, "event");
  const back = isUuid(eventId) ? `/events/${eventId}/guests` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const contactId = form(data, "contact");
    const reply = ["waiting", "yes", "no"].includes(form(data, "reply")) ? form(data, "reply") : "waiting";
    const [row] = isUuid(eventId) && isUuid(contactId)
      ? await sql("UPDATE event_guests SET reply=$3, updated_at=now() WHERE event_id=$1 AND contact_id=$2 RETURNING show_on_site", [eventId, contactId, reply])
      : [];
    if (!row) await backWith(back, "error", "That guest isn't on this event's list.");
    const [c] = await sql("SELECT name FROM letter_contacts WHERE id = $1", [contactId]);
    await logActivity(admin.email, "event.guest.reply", c?.name || "", { eventId, contactId, reply });
    const rsvp = await syncGuestRsvp({ eventId, contactId, reply, adminEmail: admin.email });
    if (rsvp) await logActivity(admin.email, "event.guest.rsvp", c?.name || "", { eventId, contactId, reply });
    const label = reply === "yes" ? "Coming" : reply === "no" ? "Can't make it" : "No reply yet";
    const note = row.show_on_site ? (reply === "yes" ? " They now show on the event page." : " They're off the event page until they're Coming.") : "";
    await backWith(back, "ok", `${c?.name}: ${label}.${note}${rsvp ? ` ${rsvp}` : ""}`);
  });
}

/** Guest tracker: put every Coming guest who isn't on the RSVP list yet on it (once each, no duplicates by name). */
export async function addComingGuestsToRsvps(data) {
  const eventId = form(data, "event");
  const back = isUuid(eventId) ? `/events/${eventId}/guests` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const coming = isUuid(eventId)
      ? await sql(`SELECT eg.contact_id, c.name FROM event_guests eg JOIN letter_contacts c ON c.id = eg.contact_id
                   LEFT JOIN registrations reg ON reg.id = eg.registration_id
                   WHERE eg.event_id = $1 AND eg.reply = 'yes' AND c.deleted_at IS NULL
                     AND (reg.id IS NULL OR reg.deleted_at IS NOT NULL OR reg.status = 'cancelled') LIMIT 100`, [eventId])
      : [];
    let added = 0;
    let linked = 0;
    for (const g of coming) {
      const note = await syncGuestRsvp({ eventId, contactId: g.contact_id, reply: "yes", adminEmail: admin.email });
      if (/already on the RSVP list/.test(note)) linked += 1;
      else if (note) added += 1;
    }
    if (added || linked) await logActivity(admin.email, "event.guest.rsvp", `${added + linked} guests`, { eventId, added, linked });
    await backWith(back, "ok", coming.length
      ? `${added} added to the RSVP list${linked ? `; ${linked} ${linked === 1 ? "was" : "were"} already on it and ${linked === 1 ? "is" : "are"} now linked` : ""}.`
      : "Every Coming guest is already on the RSVP list.");
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

/** An event's donor list: save one donor's donation for this event (amounts, receipt, thanks). */
export async function saveEventDonor(data) {
  const eventId = form(data, "event");
  const back = isUuid(eventId) ? `/events/${eventId}/donors` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const contactId = form(data, "contact");
    const { donor: d, error } = cleanEventDonor(Object.fromEntries(["status", "askedVia", "amount", "method", "receivedOn", "reference", "receiptName", "receiptAddress", "acknowledge", "publicName", "notes"].map((k) => [k, form(data, k)])));
    if (error) await backWith(back, "error", error);
    const [row] = isUuid(eventId) && isUuid(contactId)
      ? await sql(
        `UPDATE event_donors SET status=$3, asked_via=$4, amount=$5, method=$6, received_on=$7, reference=$8, receipt_name=$9, receipt_address=$10, acknowledge=$11, public_name=$12, notes=$13, updated_at=now()
          WHERE event_id=$1 AND contact_id=$2 RETURNING contact_id`,
        [eventId, contactId, d.status, d.askedVia, d.amount, d.method, d.receivedOn, d.reference, d.receiptName, d.receiptAddress, d.acknowledge, d.publicName, d.notes],
      )
      : [];
    if (!row) await backWith(back, "error", "That donor isn't on this event's list.");
    const [c] = await sql("SELECT name FROM letter_contacts WHERE id = $1", [contactId]);
    await logActivity(admin.email, "event.donor.save", c?.name || "", { eventId, contactId, status: d.status, amount: d.amount });
    await backWith(back, "ok", `Saved ${c?.name || "the donor"}.`);
  });
}

/** An event's donor list: take someone off this event (they stay available for other events). */
export async function removeEventDonor(data) {
  const eventId = form(data, "event");
  const back = isUuid(eventId) ? `/events/${eventId}/donors` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const contactId = form(data, "contact");
    const gone = isUuid(eventId) && isUuid(contactId) ? await sql("DELETE FROM event_donors WHERE event_id=$1 AND contact_id=$2 RETURNING contact_id", [eventId, contactId]) : [];
    if (gone.length) await logActivity(admin.email, "event.donor.remove", "", { eventId, contactId });
    await backWith(back, "ok", gone.length ? "Taken off this event's donor list." : "Already off the list.");
  });
}
