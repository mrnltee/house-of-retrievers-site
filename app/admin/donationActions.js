"use server";

import { sql } from "../lib/db";
import { actionAdmin, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { donationFromForm, sniffFile } from "../lib/donationForm.mjs";

/**
 * Donation tracker files (owner, 22 Nov 2026): a donor's returned Cash Donation Form and their proof of
 * payment, attached to their row on an event's donor list. Each file is its own request (the admin's
 * 4 MB request cap), saved as soon as it's picked, like event photos; the edit window's Save still saves
 * the donation details. Files are private: /donations/file/<id> serves them to signed-in admins only.
 */

const MAX_BYTES = 3 * 1024 * 1024;
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const text = (data, key) => (typeof data.get(key) === "string" ? data.get(key) : "");
const safeName = (name) => String(name || "").replace(/[^\w .()&,-]+/g, "_").trim().slice(0, 160) || "file";

async function admin() {
  try {
    return { admin: await actionAdmin("guests:edit") };
  } catch (error) {
    if (error instanceof Forbidden) return { error: error.message };
    throw error;
  }
}

/**
 * Attach one file. `kind` is "form" (the returned donation form: a PDF, or a photo of a paper form) or
 * "proof" (a payment screenshot or PDF). A returned PDF form is also read, so its answers can fill the
 * edit window for the admin to check before saving. Returns { file, read } or { error }.
 */
export async function uploadDonationFile(data) {
  const { admin: who, error } = await admin();
  if (error) return { error };
  const eventId = text(data, "event");
  const contactId = text(data, "contact");
  const kind = text(data, "kind") === "form" ? "form" : "proof";
  const file = data.get("file");
  if (!isUuid(eventId) || !isUuid(contactId)) return { error: "That donor isn't on this event's list." };
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) return { error: "Choose a file first." };
  if (file.size > MAX_BYTES) return { error: "That file is over 3 MB. Save the PDF smaller, or send a screenshot instead." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniffFile(bytes);
  if (!mime) return { error: "Use a PDF or a photo (JPEG, PNG or WebP)." };
  const [donor] = await sql("SELECT 1 FROM event_donors WHERE event_id = $1 AND contact_id = $2", [eventId, contactId]);
  if (!donor) return { error: "That donor isn't on this event's list." };
  if (kind === "proof") {
    const [{ n }] = await sql("SELECT count(*)::int AS n FROM donation_files WHERE event_id = $1 AND contact_id = $2 AND kind = 'proof'", [eventId, contactId]);
    if (n >= 10) return { error: "This donation already has 10 proofs. Remove one first." };
  }
  const name = safeName(file.name);
  const [row] = await sql(
    `INSERT INTO donation_files (event_id, contact_id, kind, mime, name, size, data, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, kind, mime, name, size, created_at`,
    [eventId, contactId, kind, mime, name, bytes.length, bytes, who.email],
  );
  await logActivity(who.email, "event.donor.file", name, { eventId, contactId, kind, fileId: row.id });
  const read = kind === "form" && mime === "application/pdf" ? donationFromForm(bytes) : null;
  return { file: { ...row, created_at: String(row.created_at) }, read };
}

/**
 * Remove one file. Removing a checked donation's last proof takes its check off too: a checked donation
 * always has proof behind it. Returns { ok, unchecked } or { error }.
 */
export async function removeDonationFile(data) {
  const { admin: who, error } = await admin();
  if (error) return { error };
  const id = text(data, "id");
  if (!isUuid(id)) return { error: "That file is already gone." };
  const [gone] = await sql("DELETE FROM donation_files WHERE id = $1 RETURNING event_id, contact_id, kind, name", [id]);
  if (!gone) return { ok: true };
  let unchecked = false;
  if (gone.kind === "proof") {
    const cleared = await sql(
      `UPDATE event_donors SET verified_at = NULL, verified_by = NULL, updated_at = now()
        WHERE event_id = $1 AND contact_id = $2 AND verified_at IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM donation_files f WHERE f.event_id = $1 AND f.contact_id = $2 AND f.kind = 'proof')
        RETURNING contact_id`,
      [gone.event_id, gone.contact_id],
    );
    unchecked = cleared.length > 0;
  }
  await logActivity(who.email, "event.donor.file.remove", gone.name || "", { eventId: gone.event_id, contactId: gone.contact_id, kind: gone.kind, unchecked });
  return { ok: true, unchecked };
}
