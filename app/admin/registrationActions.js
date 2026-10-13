"use server";

import { revalidatePath } from "next/cache";
import { sql, transaction } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { newCheckInCode, validateRsvp } from "../lib/admin/registrations.mjs";
import { eventTiers } from "../lib/admin/events.mjs";
import { UNPAID, chooseTicket, owesPayment, readProofImage, validateProof } from "../lib/eventPayments.mjs";
import { sendPass, sendReceiptRejected, sendSpotHeld, sendWaitlisted } from "../lib/passEmails";
import { deletionState } from "../lib/registrationRecovery.mjs";
import { calculateAmountDue, cleanAttendeeCounts, cleanPricingBasis } from "../lib/registrationPricing.mjs";

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

async function registration(id, { includeDeleted = false } = {}) {
  if (!isUuid(id)) return null;
  const [row] = await sql(
    `SELECT r.*, e.title, e.fee_required, e.capacity FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = $1${includeDeleted ? "" : " AND r.deleted_at IS NULL"}`,
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
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:fees");
    const reg = await registration(form(data, "id"));
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = pagePath(reg);
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
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:fees");
    const reg = await registration(form(data, "id"));
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = pagePath(reg);
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
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:fees");
    const reg = await registration(form(data, "id"));
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = pagePath(reg);
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
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:fees");
    const reg = await registration(form(data, "id"));
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = pagePath(reg);
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
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:edit");
    const reg = await registration(form(data, "id"));
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = pagePath(reg);
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
    const [event] = isUuid(eventId) ? await sql("SELECT id, title, fee_required, pricing_basis, included_furbabies_per_human, additional_furbaby_fee, price_tiers, cost FROM events WHERE id = $1", [eventId]) : [];
    if (!event) await backWith("/registrations", "error", "That event no longer exists.");
    const { value, error } = validateRsvp({
      name: form(data, "name"), email: form(data, "email"), furbabyName: form(data, "furbabyName"),
      photoConsent: data.get("photoConsent") === "on" ? "yes" : "no",
      under18: data.get("under18") === "on", guardianName: form(data, "guardianName"),
    });
    if (error) await backWith(back, "error", error);
    const ticket = chooseTicket(event.fee_required ? eventTiers(event) : [], form(data, "ticket"), { anyTier: true });
    if (ticket.error) await backWith(back, "error", ticket.error);
    const attendees = cleanAttendeeCounts(form(data, "humanCount") || 1, form(data, "furbabyCount") || 0);
    if (attendees.error) await backWith(back, "error", attendees.error);
    const payment = ["paid", "pending", "none"].includes(form(data, "payment")) ? form(data, "payment") : "none";
    const owes = owesPayment(event.fee_required, ticket.value);
    const due = calculateAmountDue({ basis: cleanPricingBasis(event.pricing_basis), tier: ticket.value, humans: attendees.humans, furbabies: attendees.furbabies, includedFurbabiesPerHuman: event.included_furbabies_per_human, additionalFurbabyFee: event.additional_furbaby_fee });
    if (due.error) await backWith(back, "error", due.error);
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
        await tx.sql("SELECT id FROM events WHERE id=$1 FOR UPDATE", [event.id]);
        const [duplicate] = await tx.sql(
          `SELECT id FROM registrations WHERE event_id=$1 AND deleted_at IS NULL
             AND lower(email)=lower($2) AND lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g'))=lower(regexp_replace(trim($3), '[[:space:]]+', ' ', 'g')) LIMIT 1`,
          [event.id, value.email, value.name],
        );
        if (duplicate && form(data, "allowDuplicate") !== "yes") {
          throw Object.assign(new Error("duplicate"), { userMessage: "That name and email already have a registration. Confirm the duplicate warning to add another." });
        }
        const [row] = await tx.sql(
          `INSERT INTO registrations (event_id, name, email, furbaby_name, photo_consent, under_18, guardian_name, status, fee_status, check_in_code,
             ticket_label, ticket_amount, human_count, furbaby_count, amount_due, pay_method, fee_reference, pay_amount, fee_checked_by, fee_checked_at, added_by, duplicate_allowed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed',$8,$9,$10,$11,$12,$13,$14,$15,NULLIF($16,''),$17,$18,$19,$20,$21) RETURNING id`,
          [event.id, value.name, value.email, value.furbabyName, value.photoConsent, value.under18, value.guardianName, feeStatus, newCheckInCode(),
            ticket.value.label, ticket.value.amount, attendees.humans, attendees.furbabies, due.amount, proofDetails.method, proofDetails.reference, proofDetails.amount,
            feeStatus === "paid" ? admin.email : null, feeStatus === "paid" ? new Date().toISOString() : null, admin.email,
            Boolean(duplicate && form(data, "allowDuplicate") === "yes")],
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

/** Edit the registration facts and attendance counts. Email is opt-in. */
export async function updateRegistration(data) {
  const id = form(data, "id");
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:edit");
    const reg = await registration(id);
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = pagePath(reg);
    const { value, error } = validateRsvp({
      name: form(data, "name"), email: form(data, "email"), furbabyName: form(data, "furbabyName"),
      photoConsent: data.get("photoConsent") === "on" ? "yes" : "no",
      under18: data.get("under18") === "on", guardianName: form(data, "guardianName"),
    });
    if (error) await backWith(back, "error", error);
    const attendees = cleanAttendeeCounts(form(data, "humanCount") || 1, form(data, "furbabyCount") || 0);
    if (attendees.error) await backWith(back, "error", attendees.error);
    const [event] = await sql("SELECT title, fee_required, pricing_basis, included_furbabies_per_human, additional_furbaby_fee, price_tiers, cost FROM events WHERE id=$1", [reg.event_id]);
    const tiers = event?.fee_required ? eventTiers(event) : [];
    const currentIndex = tiers.findIndex((tier) => tier.label === reg.ticket_label && Number(tier.amount) === Number(reg.ticket_amount));
    const chosen = chooseTicket(tiers, form(data, "ticket") || (currentIndex >= 0 ? currentIndex : undefined), { anyTier: true });
    if (chosen.error) await backWith(back, "error", chosen.error);
    const due = calculateAmountDue({ basis: cleanPricingBasis(event?.pricing_basis), tier: chosen.value, humans: attendees.humans, furbabies: attendees.furbabies, includedFurbabiesPerHuman: event?.included_furbabies_per_human, additionalFurbabyFee: event?.additional_furbaby_fee });
    if (due.error) await backWith(back, "error", due.error);
    const oldDue = reg.amount_due ?? reg.ticket_amount ?? 0;
    if (reg.fee_status === "paid" && due.amount !== oldDue) await backWith(back, "error", "This registration is already paid. Change the payment through the payment team instead of changing its attendee count or ticket.");
    const amountChanged = due.amount !== oldDue || chosen.value.label !== reg.ticket_label || Number(chosen.value.amount ?? 0) !== Number(reg.ticket_amount ?? 0);
    const nextFee = amountChanged && reg.status === "confirmed" && due.amount > 0 && reg.fee_status !== "paid" ? "waiting" : (due.amount === 0 ? "not_due" : reg.fee_status);
    await sql(
      `UPDATE registrations SET name=$2, email=$3, furbaby_name=$4, photo_consent=$5, under_18=$6, guardian_name=$7,
         ticket_label=$8, ticket_amount=$9, human_count=$10, furbaby_count=$11, amount_due=$12,
         fee_status=$13, fee_note=CASE WHEN $14 THEN NULL ELSE fee_note END WHERE id=$1`,
      [id, value.name, value.email, value.furbabyName, value.photoConsent, value.under18, value.guardianName,
        chosen.value.label, chosen.value.amount, attendees.humans, attendees.furbabies, due.amount, nextFee, amountChanged],
    );
    await logActivity(admin.email, "registration.edit", event?.title || reg.title, { registrationId: id, amountChanged });
    let note = `${value.name}'s registration was saved.`;
    if (amountChanged && nextFee === "waiting") note += " The payment is waiting for a new proof at the updated amount.";
    if (data.get("sendEmail") === "on") {
      const sent = reg.status === "waitlist" ? await sendWaitlisted(id) : nextFee === "waiting" ? await sendSpotHeld(id) : await sendPass(id, { paid: nextFee === "paid", again: true });
      note += emailNote(sent, reg.status === "waitlist" ? "The waitlist note was" : nextFee === "waiting" ? "Payment instructions were" : "Their QR pass was");
    }
    revalidatePath("/events", "layout");
    await backWith(back, "ok", note);
  });
}

export async function deleteRegistration(data) {
  const id = form(data, "id");
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:edit");
    const reg = await registration(id, { includeDeleted: true });
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = `/registrations/${reg.event_id}`;
    const state = deletionState(reg);
    if (state === "paid") await backWith(back, "error", "Paid registrations stay in the event history. Cancel this registration instead.");
    if (state === "checked-in") await backWith(back, "error", "Checked-in registrations stay in the event history.");
    if (reg.deleted_at) await backWith(back, "error", "That registration is already in Recently deleted.");
    await sql(`UPDATE registrations SET deleted_at=now(), deleted_by=$2, deleted_previous_status=status, status='cancelled' WHERE id=$1`, [id, admin.email]);
    await logActivity(admin.email, "registration.delete", reg.title, { registrationId: id });
    revalidatePath("/events", "layout");
    await backWith(`${back}?show=deleted`, "ok", `${reg.name} moved to Recently deleted for 30 days.`);
  });
}

export async function restoreRegistration(data) {
  const id = form(data, "id");
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:edit");
    const reg = await registration(id, { includeDeleted: true });
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = `/registrations/${reg.event_id}`;
    if (deletionState(reg) !== "recoverable") await backWith(back, "error", "That registration can no longer be restored.");
    const restored = await transaction(async (tx) => {
      await tx.sql("SELECT id FROM events WHERE id=$1 FOR UPDATE", [reg.event_id]);
      if (reg.deleted_previous_status === "confirmed" && reg.capacity != null) {
        const [{ count }] = await tx.sql("SELECT count(*)::int AS count FROM registrations WHERE event_id=$1 AND status='confirmed' AND deleted_at IS NULL", [reg.event_id]);
        if (count >= reg.capacity) return false;
      }
      const [duplicate] = await tx.sql(
        `SELECT id FROM registrations WHERE event_id=$1 AND id<>$2 AND deleted_at IS NULL
           AND lower(email)=lower($3) AND lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g'))=lower(regexp_replace(trim($4), '[[:space:]]+', ' ', 'g')) LIMIT 1`,
        [reg.event_id, id, reg.email, reg.name],
      );
      await tx.sql(`UPDATE registrations SET status=coalesce(deleted_previous_status, 'cancelled'), deleted_at=NULL, deleted_by=NULL, deleted_previous_status=NULL, duplicate_allowed=(duplicate_allowed OR $2) WHERE id=$1`, [id, Boolean(duplicate)]);
      return true;
    });
    if (!restored) await backWith(`${back}?show=deleted`, "error", "The event is full. Free a slot before restoring this registration.");
    await logActivity(admin.email, "registration.restore", reg.title, { registrationId: id });
    revalidatePath("/events", "layout");
    await backWith(back, "ok", `${reg.name}'s registration was restored.`);
  });
}
