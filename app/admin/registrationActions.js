"use server";

import { revalidatePath } from "next/cache";
import { sql, transaction } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { newCheckInCode, validateRsvp } from "../lib/admin/registrations.mjs";
import { eventTiers } from "../lib/admin/events.mjs";
import { UNPAID, chooseTicket, owesPayment, readProofImage, validateProof } from "../lib/eventPayments.mjs";
import { sendPass, sendReceiptRejected, sendSpotHeld } from "../lib/passEmails";

/**
 * Payments on paid events (Figma R1–R4). Every button that calls these is a
 * ConfirmButton, so each one has already been confirmed in a dialog.
 * Fee access (registrations:fees) approves, rejects, marks paid and attaches
 * receipts; adding a registration needs registrations:edit.
 */

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

async function registration(id) {
  if (!isUuid(id)) return null;
  const [row] = await sql(
    `SELECT r.*, e.title, e.fee_required, e.capacity FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = $1`,
    [id],
  );
  return row || null;
}

const pagePath = (reg) => `/registrations/${reg.event_id}/r/${reg.id}`;
const emailNote = (sent, what) => (sent.ok ? ` ${what} emailed.` : sent.skipped ? " Email isn't set up yet, so nothing was emailed." : ` The email didn't go through; use “Resend QR pass”.`);

/** Saves a receipt picture from the admin form (a data URL the browser resized). */
async function storeProof(tx, regId, dataUrl, who) {
  if (!dataUrl) return null;
  const image = readProofImage(dataUrl);
  if (image.error) return { error: image.error };
  const bytes = Buffer.from(image.value.base64, "base64");
  const [row] = await tx.sql(
    "INSERT INTO payment_proofs (registration_id, mime, data, bytes, uploaded_by) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [regId, image.value.mime, bytes, bytes.length, who],
  );
  return { id: row.id };
}

/** Approve: the reference was found in HOR's payment history. Paid, and the QR pass is emailed. */
export async function approvePayment(data) {
  const reg = await registration(form(data, "id"));
  const back = reg ? pagePath(reg) : "/registrations";
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:fees");
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    if (reg.status !== "confirmed" || !UNPAID.includes(reg.fee_status)) await backWith(back, "error", "This payment isn't waiting for a check.");
    if (!reg.fee_reference) await backWith(back, "error", "There's no reference number to match. Use “Mark paid” and type the reference.");
    if (form(data, "matched") !== "on") await backWith(back, "error", "Tick the box once you've found the reference and amount in HOR's payment history.");
    await sql("UPDATE registrations SET fee_status = 'paid', fee_checked_by = $2, fee_checked_at = now(), fee_note = NULL WHERE id = $1", [reg.id, admin.email]);
    await logActivity(admin.email, "registration.approve", reg.title, { registrationId: reg.id, reference: reg.fee_reference });
    const sent = await sendPass(reg.id, { paid: true });
    revalidatePath("/events", "layout");
    await backWith(`/registrations/${reg.event_id}?show=check`, "ok", `${reg.name}'s payment is approved.${emailNote(sent, "Their QR pass was")}`);
  });
}

/** Mark paid without their upload (cash, or a payment matched another way): the admin types the details. */
export async function markPaid(data) {
  const reg = await registration(form(data, "id"));
  const back = reg ? pagePath(reg) : "/registrations";
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:fees");
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    if (reg.status !== "confirmed" || reg.fee_status === "paid") await backWith(back, "error", "This registration isn't waiting for a payment.");
    const { value, error } = validateProof({ method: form(data, "method"), reference: form(data, "reference"), amount: form(data, "amount") }, { admin: true });
    if (error) await backWith(back, "error", error);
    await sql(
      `UPDATE registrations SET fee_status = 'paid', pay_method = $2, fee_reference = NULLIF($3, ''), pay_amount = $4,
         fee_checked_by = $5, fee_checked_at = now(), fee_note = NULL WHERE id = $1`,
      [reg.id, value.method, value.reference, value.amount, admin.email],
    );
    await logActivity(admin.email, "registration.paid", reg.title, { registrationId: reg.id, method: value.method });
    const sent = await sendPass(reg.id, { paid: true });
    revalidatePath("/events", "layout");
    await backWith(back, "ok", `Marked paid.${emailNote(sent, "Their QR pass was")}`);
  });
}

/** Ask for a new receipt: their reason is emailed; the spot stays held. */
export async function rejectPayment(data) {
  const reg = await registration(form(data, "id"));
  const back = reg ? pagePath(reg) : "/registrations";
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:fees");
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    if (reg.status !== "confirmed" || !["review", "waiting"].includes(reg.fee_status)) await backWith(back, "error", "This payment isn't waiting for a check.");
    const reason = form(data, "reason").replace(/\s+/g, " ").trim();
    if (!reason) await backWith(back, "error", "Write the reason they'll see.");
    if (reason.length > 400) await backWith(back, "error", "Keep the reason under 400 characters.");
    await sql("UPDATE registrations SET fee_status = 'rejected', fee_note = $2, fee_checked_by = $3, fee_checked_at = now() WHERE id = $1", [reg.id, reason, admin.email]);
    await logActivity(admin.email, "registration.reject", reg.title, { registrationId: reg.id });
    const sent = await sendReceiptRejected(reg.id);
    await backWith(`/registrations/${reg.event_id}?show=check`, "ok", `Asked ${reg.name} for a new receipt.${emailNote(sent, "Your reason was")}`);
  });
}

/** Attach (or replace) a receipt for someone, e.g. one they sent by chat. Unpaid ones go to "To check". */
export async function attachReceipt(data) {
  const reg = await registration(form(data, "id"));
  const back = reg ? pagePath(reg) : "/registrations";
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:fees");
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    if (!reg.fee_required) await backWith(back, "error", "This event has no fee.");
    const { value, error } = validateProof({ method: form(data, "method"), reference: form(data, "reference"), amount: form(data, "amount") }, { admin: true });
    if (error) await backWith(back, "error", error);
    if (!form(data, "receipt")) await backWith(back, "error", "Pick the receipt picture first.");
    const stored = await transaction(async (tx) => {
      const proof = await storeProof(tx, reg.id, form(data, "receipt"), admin.email);
      if (proof?.error) return proof;
      await tx.sql(
        `UPDATE registrations SET pay_method = $2, fee_reference = NULLIF($3, ''), pay_amount = $4, proof_at = now(),
           fee_status = CASE WHEN fee_status = 'paid' THEN 'paid' ELSE 'review' END, fee_note = CASE WHEN fee_status = 'paid' THEN fee_note ELSE NULL END
         WHERE id = $1`,
        [reg.id, value.method, value.reference, value.amount],
      );
      return proof;
    });
    if (stored?.error) await backWith(back, "error", stored.error);
    await logActivity(admin.email, "registration.receipt", reg.title, { registrationId: reg.id });
    await backWith(back, "ok", reg.fee_status === "paid" ? "Receipt saved." : "Receipt saved. It's in “To check” now.");
  });
}

/** Email the QR pass again. */
export async function resendPass(data) {
  const reg = await registration(form(data, "id"));
  const back = reg ? pagePath(reg) : "/registrations";
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:edit");
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    if (reg.status !== "confirmed" || (reg.fee_required && UNPAID.includes(reg.fee_status))) await backWith(back, "error", "Only confirmed registrations with no payment owing get a QR pass.");
    const sent = await sendPass(reg.id, { paid: reg.fee_status === "paid", again: true });
    if (!sent.ok) await backWith(back, "error", sent.skipped ? "Email isn't set up yet (Resend key missing)." : "The email didn't go through. Try again in a moment.");
    await logActivity(admin.email, "registration.pass", reg.title, { registrationId: reg.id });
    await backWith(back, "ok", `QR pass sent to ${reg.email}.`);
  });
}

/**
 * Add someone by hand (Figma R3): people who paid before the system, at the
 * door, or guests. Over capacity is allowed (the dialog says so).
 */
export async function addRegistration(data) {
  const eventId = form(data, "eventId");
  const back = isUuid(eventId) ? `/registrations/${eventId}/add` : "/registrations";
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:edit");
    const [event] = isUuid(eventId) ? await sql("SELECT id, title, fee_required, price_tiers, cost FROM events WHERE id = $1", [eventId]) : [];
    if (!event) await backWith("/registrations", "error", "That event no longer exists.");
    const { value, error } = validateRsvp({
      name: form(data, "name"), email: form(data, "email"), furbabyName: form(data, "furbabyName"),
      photoConsent: data.get("photoConsent") === "on" ? "yes" : "no",
      under18: data.get("under18") === "on", guardianName: form(data, "guardianName"),
    });
    if (error) await backWith(back, "error", error);
    const ticket = chooseTicket(event.fee_required ? eventTiers(event) : [], form(data, "ticket"), { anyTier: true });
    if (ticket.error) await backWith(back, "error", ticket.error);
    const payment = ["paid", "pending", "none"].includes(form(data, "payment")) ? form(data, "payment") : "none";
    const owes = owesPayment(event.fee_required, ticket.value);
    let feeStatus = "not_due";
    let proofDetails = { method: null, reference: "", amount: null };
    if (owes && payment === "paid") {
      const checked = validateProof({ method: form(data, "method"), reference: form(data, "reference"), amount: form(data, "amount") || String(ticket.value.amount ?? "") }, { admin: true });
      if (checked.error) await backWith(back, "error", checked.error);
      proofDetails = checked.value;
      feeStatus = "paid";
    } else if (owes && payment === "pending") feeStatus = "waiting";

    let created;
    try {
      created = await transaction(async (tx) => {
        const [row] = await tx.sql(
          `INSERT INTO registrations (event_id, name, email, furbaby_name, photo_consent, under_18, guardian_name, status, fee_status, check_in_code,
             ticket_label, ticket_amount, pay_method, fee_reference, pay_amount, fee_checked_by, fee_checked_at, added_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed',$8,$9,$10,$11,$12,NULLIF($13,''),$14,$15,$16,$17) RETURNING id`,
          [event.id, value.name, value.email, value.furbabyName, value.photoConsent, value.under18, value.guardianName, feeStatus, newCheckInCode(),
            ticket.value.label, ticket.value.amount, proofDetails.method, proofDetails.reference, proofDetails.amount,
            feeStatus === "paid" ? admin.email : null, feeStatus === "paid" ? new Date().toISOString() : null, admin.email],
        );
        const receipt = form(data, "receipt");
        if (receipt) {
          const proof = await storeProof(tx, row.id, receipt, admin.email);
          if (proof?.error) throw Object.assign(new Error(proof.error), { userMessage: proof.error });
          await tx.sql("UPDATE registrations SET proof_at = now() WHERE id = $1", [row.id]);
        }
        return row;
      });
    } catch (dbError) {
      if (dbError?.code === "23505") await backWith(back, "error", "That email is already registered for this event.");
      if (dbError?.userMessage) await backWith(back, "error", dbError.userMessage);
      throw dbError;
    }
    await logActivity(admin.email, "registration.add", event.title, { registrationId: created.id, payment: feeStatus });
    let note = `${value.name} is added.`;
    if (data.get("sendEmail") === "on") {
      const sent = feeStatus === "waiting" ? await sendSpotHeld(created.id) : await sendPass(created.id, { paid: feeStatus === "paid" });
      note += emailNote(sent, feeStatus === "waiting" ? "How to pay was" : "Their QR pass was");
    }
    revalidatePath("/events", "layout");
    await backWith(`/registrations/${event.id}`, "ok", note);
  });
}
