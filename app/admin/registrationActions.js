"use server";

import { adminCustomAnswers, cleanCustomQuestions } from "../lib/customQuestions.mjs";
import { revalidatePath } from "next/cache";
import { sql, transaction } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { newCheckInCode, validateRsvp } from "../lib/admin/registrations.mjs";
import { eventTiers } from "../lib/admin/events.mjs";
import { ADMIN_PAY_METHODS, UNPAID, chooseTicket, cleanReference, owesPayment, parsePeso, readProofImage, validateProof } from "../lib/eventPayments.mjs";
import { sendPass, sendReceiptRejected, sendSpotHeld, sendWaitlisted } from "../lib/passEmails";
import { deletionState } from "../lib/registrationRecovery.mjs";
import { calculateAmountDue, cleanAttendeeCounts, cleanPricingBasis, overpaidBy, paidAmountChangeAllowed } from "../lib/registrationPricing.mjs";
import { CAPACITY_USED_SQL, validateCapacityCounts } from "../lib/eventCapacity.mjs";
import { ACTIVE_REGISTRATION_SQL, REMINDER_HOLD_OPTIONS, cleanReminderHoldMinutes, isActiveRegistrationHold, isExpiredHold } from "../lib/registrationHolds.mjs";
import { expiredHoldFits } from "../lib/expiredHoldFit";
import { can } from "../lib/admin/roles.mjs";
import { savePersonPhoto } from "../lib/personPhotos";
import { saveRegistrationPhoto, welcomePhotoFor } from "../lib/welcomePhotos";
import { readCheckInTime } from "../lib/manualCheckIn.mjs";
import { cleanBreeds } from "../lib/breeds.mjs";

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
    `SELECT r.*, e.title, e.date AS event_date, e.fee_required, e.capacity, e.capacity_basis, e.rsvp_form_config FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = $1${includeDeleted ? "" : " AND r.deleted_at IS NULL"}`,
    [id],
  );
  return row || null;
}

const formBreeds = (data, furbabies) => cleanBreeds([0, 1, 2, 3].map((i) => form(data, `furbabyBreed${i}`)), furbabies);
const pagePath = (reg) => `/registrations/${reg.event_id}/r/${reg.id}`;
const emailNote = (sent, what) => (sent.ok ? ` ${what} emailed.` : sent.skipped ? " Email isn't set up yet, so nothing was emailed." : ` The email didn't go through; use “Resend QR pass”.`);

/**
 * Flips a registration to Paid, but only after rechecking capacity when its
 * hold had expired (an expired "waiting" hold doesn't count toward capacity,
 * so someone else may have taken the slot since). Returns false, with
 * nothing changed, when the event is now full.
 */
async function capacityCheckedUpdate(reg, run) {
  const expiredHold = reg.fee_status === "waiting" && !isActiveRegistrationHold({ feeStatus: reg.fee_status, holdExpiresAt: reg.hold_expires_at });
  return transaction(async (tx) => {
    await tx.sql("SELECT id FROM events WHERE id=$1 FOR UPDATE", [reg.event_id]);
    if (expiredHold && reg.capacity != null) {
      const [{ used }] = await tx.sql(
        `SELECT ${CAPACITY_USED_SQL} AS used FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.event_id=$1 AND r.id<>$2 AND r.status='confirmed' AND r.deleted_at IS NULL AND ${ACTIVE_REGISTRATION_SQL}`,
        [reg.event_id, reg.id],
      );
      const request = validateCapacityCounts(reg.capacity_basis, reg.human_count, reg.furbaby_count, { allowNoFurbaby: true });
      if (request.error || Number(used || 0) + request.units > reg.capacity) return false;
    }
    await run(tx);
    return true;
  });
}

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
    const approved = await capacityCheckedUpdate(reg, async (tx) => {
      await tx.sql("UPDATE registrations SET fee_status = 'paid', fee_checked_by = $2, fee_checked_at = now(), fee_note = NULL WHERE id = $1", [reg.id, admin.email]);
    });
    if (!approved) await backWith(back, "error", "This hold expired and the event has filled up since. There's no room to confirm this payment — message them before approving.");
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
    const marked = await capacityCheckedUpdate(reg, async (tx) => {
      await tx.sql(
        `UPDATE registrations SET fee_status = 'paid', pay_method = $2, fee_reference = NULLIF($3, ''), pay_amount = $4,
           fee_checked_by = $5, fee_checked_at = now(), fee_note = NULL WHERE id = $1`,
        [reg.id, value.method, value.reference, value.amount, admin.email],
      );
    });
    if (!marked) await backWith(back, "error", "This hold expired and the event has filled up since. There's no room to confirm this payment — message them before marking it paid.");
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
/** The event's own Yes / No answers from an admin form, as JSON for the column (null when none answered). */
function answersJson(event, data) {
  const value = adminCustomAnswers(cleanCustomQuestions(event?.rsvp_form_config?.questions), (key) => data.get(key));
  return value ? JSON.stringify(value) : null;
}

export async function addRegistration(data) {
  const eventId = form(data, "eventId");
  const back = isUuid(eventId) ? `/registrations/${eventId}/add` : "/registrations";
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:edit");
    const [event] = isUuid(eventId) ? await sql("SELECT id, title, fee_required, capacity_basis, pricing_basis, included_furbabies_per_human, additional_furbaby_fee, price_tiers, cost, rsvp_form_config FROM events WHERE id = $1", [eventId]) : [];
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
    const capacityRequest = validateCapacityCounts(event.capacity_basis, attendees.humans, attendees.furbabies, { allowNoFurbaby: true });
    if (capacityRequest.error) await backWith(back, "error", capacityRequest.error);
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
             ticket_label, ticket_amount, human_count, furbaby_count, amount_due, pay_method, fee_reference, pay_amount, fee_checked_by, fee_checked_at, added_by, duplicate_allowed, furbaby_breeds, custom_answers)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed',$8,$9,$10,$11,$12,$13,$14,$15,NULLIF($16,''),$17,$18,$19,$20,$21,$22,$23) RETURNING id`,
          [event.id, value.name, value.email, value.furbabyName, value.photoConsent, value.under18, value.guardianName, feeStatus, newCheckInCode(),
            ticket.value.label, ticket.value.amount, attendees.humans, attendees.furbabies, due.amount, proofDetails.method, proofDetails.reference, proofDetails.amount,
            feeStatus === "paid" ? admin.email : null, feeStatus === "paid" ? new Date().toISOString() : null, admin.email,
            Boolean(duplicate && form(data, "allowDuplicate") === "yes"), formBreeds(data, attendees.furbabies), answersJson(event, data)],
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
    const [event] = await sql("SELECT title, fee_required, capacity, capacity_basis, pricing_basis, included_furbabies_per_human, additional_furbaby_fee, price_tiers, cost, rsvp_form_config FROM events WHERE id=$1", [reg.event_id]);
    const capacityRequest = validateCapacityCounts(event?.capacity_basis, attendees.humans, attendees.furbabies, { allowNoFurbaby: true });
    if (capacityRequest.error) await backWith(back, "error", capacityRequest.error);
    const tiers = event?.fee_required ? eventTiers(event) : [];
    const currentIndex = tiers.findIndex((tier) => tier.label === reg.ticket_label && Number(tier.amount) === Number(reg.ticket_amount));
    const chosen = chooseTicket(tiers, form(data, "ticket") || (currentIndex >= 0 ? currentIndex : undefined), { anyTier: true });
    if (chosen.error) await backWith(back, "error", chosen.error);
    const due = calculateAmountDue({ basis: cleanPricingBasis(event?.pricing_basis), tier: chosen.value, humans: attendees.humans, furbabies: attendees.furbabies, includedFurbabiesPerHuman: event?.included_furbabies_per_human, additionalFurbabyFee: event?.additional_furbaby_fee });
    if (due.error) await backWith(back, "error", due.error);
    const oldDue = reg.amount_due ?? reg.ticket_amount ?? 0;
    if (reg.fee_status === "paid" && !paidAmountChangeAllowed({ oldDue, nextDue: due.amount, payAmount: reg.pay_amount })) {
      await backWith(back, "error", "This registration is already paid. The existing payment must match the new amount before its attendee count or ticket can change.");
    }
    const amountChanged = due.amount !== oldDue || chosen.value.label !== reg.ticket_label || Number(chosen.value.amount ?? 0) !== Number(reg.ticket_amount ?? 0);
    const nextFee = amountChanged && reg.status === "confirmed" && due.amount > 0 && reg.fee_status !== "paid" ? "waiting" : (due.amount === 0 ? "not_due" : reg.fee_status);
    const saved = await transaction(async (tx) => {
      await tx.sql("SELECT id FROM events WHERE id=$1 FOR UPDATE", [reg.event_id]);
      if (reg.status === "confirmed" && event?.capacity != null) {
        const [{ used }] = await tx.sql(`SELECT ${CAPACITY_USED_SQL} AS used FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.event_id=$1 AND r.id<>$2 AND r.status='confirmed' AND r.deleted_at IS NULL AND (r.fee_status <> 'waiting' OR r.hold_expires_at IS NULL OR r.hold_expires_at > now())`, [reg.event_id, id]);
        if (Number(used || 0) + capacityRequest.units > event.capacity) return false;
      }
      await tx.sql(
        `UPDATE registrations SET name=$2, email=$3, furbaby_name=$4, photo_consent=$5, under_18=$6, guardian_name=$7,
           ticket_label=$8, ticket_amount=$9, human_count=$10, furbaby_count=$11, amount_due=$12,
           fee_status=$13, fee_note=CASE WHEN $14 THEN NULL ELSE fee_note END, furbaby_breeds=CASE WHEN $16 THEN $15 ELSE furbaby_breeds END, custom_answers=CASE WHEN $18 THEN $17::jsonb ELSE custom_answers END WHERE id=$1`,
        [id, value.name, value.email, value.furbabyName, value.photoConsent, value.under18, value.guardianName,
          chosen.value.label, chosen.value.amount, attendees.humans, attendees.furbabies, due.amount, nextFee, amountChanged, formBreeds(data, attendees.furbabies), data.has("breedsSent"), answersJson(event, data), data.has("customAnswersSent")],
      );
      return true;
    });
    if (!saved) await backWith(back, "error", "Those attendee counts would exceed the event capacity. Cancel someone or raise the capacity first.");
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

/** Correct only a paid registration's saved amount snapshot when its existing payment matches. */
export async function correctPaidAmount(data) {
  const id = form(data, "id");
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:fees");
    const reg = await registration(id);
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = pagePath(reg);
    if (reg.fee_status !== "paid") await backWith(back, "error", "Only a paid registration can have its saved amount corrected.");
    const amount = parsePeso(form(data, "amount"));
    if (amount === undefined || amount === null) await backWith(back, "error", "Enter the amount already found in the payment record.");
    const oldDue = reg.amount_due ?? reg.ticket_amount ?? 0;
    if (!paidAmountChangeAllowed({ oldDue, nextDue: amount, payAmount: reg.pay_amount })) {
      await backWith(back, "error", "The corrected amount must exactly match the payment already recorded for this registration.");
    }
    await sql("UPDATE registrations SET amount_due=$2 WHERE id=$1", [reg.id, amount]);
    await logActivity(admin.email, "registration.edit", reg.title, { registrationId: reg.id, amountCorrection: true, previousAmount: oldDue, amount });
    revalidatePath("/events", "layout");
    await backWith(back, "ok", `${reg.name}'s saved amount was corrected. Their payment, reference and QR pass were left unchanged.`);
  });
}

/**
 * Record a refund on a paid registration that paid more than it owes now (e.g. 2
 * hoomans + 2 furbabies paid ₱4,250 before pair pricing; it owes ₱3,500). HOR sends
 * the money back itself; this records how much, how and the reference, sets the
 * amount due to today's price, and keeps it Paid with its QR pass. Nothing is emailed.
 */
export async function recordRefund(data) {
  const id = form(data, "id");
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:fees");
    const reg = await registration(id);
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = pagePath(reg);
    if (reg.fee_status !== "paid") await backWith(back, "error", "Only a paid registration can have a refund recorded.");
    const [event] = await sql("SELECT fee_required, pricing_basis, price_tiers, cost, included_furbabies_per_human, additional_furbaby_fee FROM events WHERE id=$1", [reg.event_id]);
    const tier = eventTiers(event).find((t) => t.label === reg.ticket_label && Number(t.amount) === Number(reg.ticket_amount));
    if (!tier) await backWith(back, "error", "This registration's ticket isn't in the event's prices any more, so today's amount can't be worked out.");
    const due = calculateAmountDue({ basis: cleanPricingBasis(event.pricing_basis), tier, humans: reg.human_count ?? 1, furbabies: reg.furbaby_count ?? 0, includedFurbabiesPerHuman: event.included_furbabies_per_human, additionalFurbabyFee: event.additional_furbaby_fee });
    if (due.error) await backWith(back, "error", due.error);
    const refund = overpaidBy({ payAmount: reg.pay_amount, due: due.amount, refunded: reg.refund_amount });
    if (!refund) await backWith(back, "error", "This registration didn't pay more than it owes, so there's nothing to refund.");
    const method = Object.hasOwn(ADMIN_PAY_METHODS, form(data, "method")) ? form(data, "method") : null;
    if (!method) await backWith(back, "error", "Pick how the refund was sent.");
    const reference = cleanReference(form(data, "reference"));
    if (!reference) await backWith(back, "error", "Enter the refund's reference number.");
    if (data.get("sent") !== "on") await backWith(back, "error", "Tick that the refund has been sent first.");
    await sql(
      `UPDATE registrations SET refund_amount = coalesce(refund_amount, 0) + $2, refund_method = $3, refund_reference = $4, refunded_at = now(), refunded_by = $5, amount_due = $6
       WHERE id = $1 AND fee_status = 'paid'`,
      [reg.id, refund, method, reference, admin.email, due.amount],
    );
    await logActivity(admin.email, "registration.refund", reg.title, { registrationId: reg.id, refund, method, reference, previousAmount: reg.amount_due, amount: due.amount });
    revalidatePath("/events", "layout");
    await backWith(back, "ok", `Refund of ₱${refund.toLocaleString("en-PH")} recorded for ${reg.name}. They stay Paid with their QR pass; nothing was emailed.`);
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
        const [{ used }] = await tx.sql(`SELECT ${CAPACITY_USED_SQL} AS used FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.event_id=$1 AND r.status='confirmed' AND r.deleted_at IS NULL AND (r.fee_status <> 'waiting' OR r.hold_expires_at IS NULL OR r.hold_expires_at > now())`, [reg.event_id]);
        const request = validateCapacityCounts(reg.capacity_basis, reg.human_count, reg.furbaby_count, { allowNoFurbaby: true });
        if (request.error || Number(used || 0) + request.units > reg.capacity) return false;
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

/**
 * The photo the check-in welcome card shows for one RSVP. Upload one, go back
 * to the People profile photo (automatic), or show initials. With "also save",
 * the upload replaces the matched People profile photo too.
 */
export async function uploadWelcomePhoto(data) {
  const id = form(data, "id");
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:edit");
    const reg = await registration(id);
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = pagePath(reg);
    const dataUrl = form(data, "photoData");
    if (!dataUrl || dataUrl.length > 4 * 1024 * 1024) await backWith(back, "error", "Pick a photo first (JPG or PNG).");
    // The People match is worked out here, never taken from the form.
    const match = await welcomePhotoFor(reg.id, reg.event_id);
    const saved = await saveRegistrationPhoto(reg.id, dataUrl, admin.email);
    if (!saved) await backWith(back, "error", "That photo couldn't be saved. Try another one.");
    const toProfile = form(data, "saveToPerson") === "on" && can(admin.roles, "people:edit") && match?.personId
      ? Boolean(await savePersonPhoto(match.personId, dataUrl))
      : false;
    await logActivity(admin.email, "registration.photo", reg.title, { registrationId: reg.id, source: "own", personId: toProfile ? match.personId : undefined });
    await backWith(back, "ok", `Welcome photo saved for ${reg.name}.${toProfile ? " It's on their People profile too." : ""}`);
  });
}

export async function useProfileWelcomePhoto(data) {
  const id = form(data, "id");
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:edit");
    const reg = await registration(id);
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    await sql("UPDATE registrations SET welcome_photo = NULL WHERE id = $1", [reg.id]);
    await logActivity(admin.email, "registration.photo", reg.title, { registrationId: reg.id, source: "people" });
    await backWith(pagePath(reg), "ok", `The door will use the photo from ${reg.name}'s People profile.`);
  });
}

export async function useInitialsWelcomePhoto(data) {
  const id = form(data, "id");
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:edit");
    const reg = await registration(id);
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    await sql("UPDATE registrations SET welcome_photo = 'initials' WHERE id = $1", [reg.id]);
    await logActivity(admin.email, "registration.photo", reg.title, { registrationId: reg.id, source: "initials" });
    await backWith(pagePath(reg), "ok", `The door will show ${reg.name}'s initials.`);
  });
}

/** Check in someone the door missed (forgot to scan, internet down), at the time they actually arrived. */
/**
 * "Send payment reminder" on registrations whose payment hold ran out: for each
 * one that still fits the event (capacity, its ticket's first-N units, the
 * hooman limit; checked under the event lock), hold the spot again for the
 * chosen time and email them their payment link with the new deadline. One
 * registration (`id`) or every expired hold of an event (`eventId` + `all`).
 * Ones with no room left are left as they are and listed in the result.
 */
export async function remindExpiredHolds(data) {
  const id = form(data, "id");
  const eventId = form(data, "eventId");
  const all = form(data, "all") === "1";
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:fees");
    const minutes = cleanReminderHoldMinutes(form(data, "minutes"));
    const first = !all && isUuid(id) ? await registration(id) : null;
    const event = all ? (isUuid(eventId) ? eventId : null) : first?.event_id;
    if (!event) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = all ? `/registrations/${event}?show=expired` : pagePath(first);
    const outcome = await transaction(async (tx) => {
      await tx.sql("SELECT id FROM events WHERE id=$1 FOR UPDATE", [event]);
      const rows = await tx.sql(
        `SELECT r.*, e.title, e.capacity, e.capacity_basis, e.pricing_basis, e.price_tiers, e.cost, e.max_public_humans
           FROM registrations r JOIN events e ON e.id = r.event_id
          WHERE r.event_id = $1 ${all ? "" : "AND r.id = $2"} ORDER BY r.created_at`,
        all ? [event] : [event, id],
      );
      const reminded = [];
      const full = [];
      for (const reg of rows.filter((r) => isExpiredHold(r))) {
        if (!(await expiredHoldFits(tx, reg))) { full.push(reg.name); continue; }
        await tx.sql(
          "UPDATE registrations SET hold_expires_at = now() + make_interval(mins => $2), hold_reminded_at = now(), hold_reminders = hold_reminders + 1 WHERE id = $1 AND fee_status = 'waiting'",
          [reg.id, minutes],
        );
        reminded.push(reg);
      }
      return { reminded, full, title: rows[0]?.title || "" };
    });
    if (!outcome.reminded.length && !outcome.full.length) await backWith(back, "error", "There's no expired payment hold to remind.");
    let emailed = 0;
    for (const reg of outcome.reminded) {
      const sent = await sendSpotHeld(reg.id, { again: true });
      if (sent.ok) emailed += 1;
      await logActivity(admin.email, "registration.remind", outcome.title, { registrationId: reg.id, minutes, emailed: Boolean(sent.ok) });
    }
    revalidatePath("/events", "layout");
    const held = REMINDER_HOLD_OPTIONS.find(([m]) => m === minutes)?.[1] || `${minutes} minutes`;
    const parts = [];
    if (outcome.reminded.length) parts.push(`${outcome.reminded.map((r) => r.name).join(", ")}: spot held again for ${held}. ${emailed === outcome.reminded.length ? "Reminder emailed." : emailed ? `${emailed} of ${outcome.reminded.length} reminders emailed; let the others know.` : "Email isn't sent; let them know."}`);
    if (outcome.full.length) parts.push(`No room left for ${outcome.full.join(", ")}, so they weren't reminded. Offer Regular, Hooman only or the dog waitlist instead.`);
    await backWith(back, outcome.reminded.length ? "ok" : "error", parts.join(" "));
  });
}

export async function manualCheckIn(data) {
  const id = form(data, "id");
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:edit");
    const reg = await registration(id);
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = `/registrations/${reg.event_id}`;
    if (reg.status !== "confirmed") await backWith(back, "error", `${reg.name} isn't confirmed (waitlist or cancelled), so they can't be checked in.`);
    if (reg.checked_in_at) await backWith(back, "error", `${reg.name} is already checked in.`);
    const time = readCheckInTime({ date: form(data, "checkinDate"), time: form(data, "checkinTime") }, { eventDate: String(reg.event_date).slice(0, 10) });
    if (time.error) await backWith(back, "error", time.error);
    const rows = await sql(
      "UPDATE registrations SET checked_in_at = $2, checked_in_by = $3, checked_in_source = 'manual' WHERE id = $1 AND checked_in_at IS NULL RETURNING id",
      [reg.id, time.value, admin.email],
    );
    if (!rows.length) await backWith(back, "error", `${reg.name} is already checked in.`);
    await logActivity(admin.email, "registration.checkin", reg.title, { registrationId: reg.id, manual: true, at: time.value });
    const at = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(time.value));
    await backWith(back, "ok", `${reg.name} is checked in at ${at}.`);
  });
}

/** Clears a check-in entered by mistake. Nothing else about the registration changes. */
export async function undoCheckIn(data) {
  const id = form(data, "id");
  return guarded("/registrations", async () => {
    const admin = await actionAdmin("registrations:edit");
    const reg = await registration(id);
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const back = `/registrations/${reg.event_id}`;
    if (!reg.checked_in_at) await backWith(back, "error", `${reg.name} isn't checked in.`);
    await sql("UPDATE registrations SET checked_in_at = NULL, checked_in_by = NULL, checked_in_source = NULL WHERE id = $1", [reg.id]);
    await logActivity(admin.email, "registration.uncheckin", reg.title, { registrationId: reg.id, was: reg.checked_in_at });
    await backWith(back, "ok", `${reg.name}'s check-in was undone.`);
  });
}
