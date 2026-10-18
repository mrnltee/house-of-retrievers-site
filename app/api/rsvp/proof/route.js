import { NextResponse } from "next/server";
import { hasDatabase, transaction } from "../../../lib/db";
import { normalizeCode } from "../../../lib/admin/registrations.mjs";
import { logActivity } from "../../../lib/admin/log";
import { alertAdmins } from "../../../lib/admin/notify";
import { clientIp, createRateLimiter } from "../../../lib/spamGuard.mjs";
import { UNPAID, payMethodLabel, readProofImage, validateProof } from "../../../lib/eventPayments.mjs";
import { ACTIVE_REGISTRATION_SQL, isActiveRegistrationHold, lateProofFits } from "../../../lib/registrationHolds.mjs";
import { CAPACITY_USED_SQL, validateCapacityCounts } from "../../../lib/eventCapacity.mjs";
import { eventTiers } from "../../../lib/admin/events.mjs";
import { TICKET_COUNTS_SQL, countsFromRows } from "../../../lib/ticketCounts.mjs";
import { tierLeft } from "../../../lib/prices.mjs";
import { ticketLimitUnits } from "../../../lib/registrationPricing.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A few tries per person: a wrong screenshot, a retake. Not a place for bulk uploads.
const limiter = createRateLimiter({ limit: 8, windowMs: 10 * 60 * 1000 });
const noStore = { "Cache-Control": "no-store" };
const fail = (message, status = 422) => NextResponse.json({ error: message }, { status, headers: noStore });

/**
 * A registrant's payment proof: how they paid, the reference number and their
 * confirmation screenshot. Their pass code is the key (it's in their link).
 * Moves the payment to "To check"; an admin approves it.
 */
export async function POST(request) {
  if (!hasDatabase()) return fail("Payments open once the events system is switched on.", 503);
  const rate = limiter.hit(clientIp(request.headers));
  if (!rate.allowed) return NextResponse.json({ error: "That's a lot of uploads. Please wait a few minutes." }, { status: 429, headers: { ...noStore, "Retry-After": String(rate.retryAfterSeconds) } });

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Something went wrong with that request.", 400);
  }
  const code = normalizeCode(body?.code);
  if (!code) return fail("That RSVP link doesn't look right.", 404);
  const { value, error } = validateProof(body);
  if (error) return fail(error);
  const image = readProofImage(body?.image);
  if (image.error) return fail(image.error);
  const bytes = Buffer.from(image.value.base64, "base64");

  const result = await transaction(async (tx) => {
    const [reg] = await tx.sql(
      `SELECT r.id, r.name, r.status, r.fee_status, r.hold_expires_at, r.event_id, r.human_count, r.furbaby_count, r.ticket_label, r.ticket_amount,
              e.title, e.fee_required, e.capacity, e.capacity_basis, e.pricing_basis, e.price_tiers, e.cost
         FROM registrations r JOIN events e ON e.id = r.event_id
        WHERE r.check_in_code = $1 AND r.deleted_at IS NULL FOR UPDATE OF r`,
      [code],
    );
    if (!reg) return { error: "We couldn't find that RSVP.", status: 404 };
    if (reg.status !== "confirmed" || !reg.fee_required) return { error: "This RSVP doesn't need a payment.", status: 409 };
    if (reg.fee_status === "paid") return { error: "Your payment is already confirmed. Your QR pass is on this page.", status: 409 };
    if (!UNPAID.includes(reg.fee_status)) return { error: "This RSVP doesn't need a payment.", status: 409 };
    // A late receipt, after the hold expired, is still accepted if there's still room.
    if (reg.fee_status === "waiting" && !isActiveRegistrationHold({ feeStatus: reg.fee_status, holdExpiresAt: reg.hold_expires_at })) {
      await tx.sql("SELECT id FROM events WHERE id=$1 FOR UPDATE", [reg.event_id]);
      const capacityRequest = validateCapacityCounts(reg.capacity_basis, reg.human_count, reg.furbaby_count, { allowNoFurbaby: true });
      let capacityUsed = 0;
      if (!capacityRequest.error && reg.capacity != null) {
        const [{ used }] = await tx.sql(
          `SELECT ${CAPACITY_USED_SQL} AS used FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.event_id=$1 AND r.id<>$2 AND r.status='confirmed' AND r.deleted_at IS NULL AND ${ACTIVE_REGISTRATION_SQL}`,
          [reg.event_id, reg.id],
        );
        capacityUsed = Number(used || 0);
      }
      let tierLimit = null;
      let tierLeftCount = null;
      let tierUnits = 0;
      if (!capacityRequest.error) {
        const selectedTier = eventTiers(reg).find((t) => t.label === reg.ticket_label && Number(t.amount) === Number(reg.ticket_amount));
        if (selectedTier?.limit) {
          const counts = countsFromRows(await tx.sql(TICKET_COUNTS_SQL, [reg.event_id]));
          tierLimit = selectedTier.limit;
          tierLeftCount = tierLeft(selectedTier, counts);
          tierUnits = ticketLimitUnits(reg.pricing_basis, selectedTier, reg.human_count ?? 1, reg.furbaby_count ?? 0);
        }
      }
      const fits = !capacityRequest.error && lateProofFits({ capacity: reg.capacity, capacityUsed, capacityUnits: capacityRequest.units, tierLimit, tierLeft: tierLeftCount, tierUnits });
      if (!fits) return { error: "This payment hold expired, and the event has filled up since. Message us on Instagram or Facebook and we'll see what we can do.", status: 409 };
    }
    const [proof] = await tx.sql(
      "INSERT INTO payment_proofs (registration_id, mime, data, bytes, uploaded_by) VALUES ($1, $2, $3, $4, 'Registrant') RETURNING id",
      [reg.id, image.value.mime, bytes, bytes.length],
    );
    await tx.sql(
      `UPDATE registrations SET fee_status = 'review', pay_method = $2, fee_reference = $3, pay_amount = $4, proof_at = now(), fee_note = NULL
        WHERE id = $1`,
      [reg.id, value.method, value.reference, value.amount],
    );
    return { reg, proofId: proof.id };
  });
  if (result.error) return fail(result.error, result.status);

  await logActivity("Registrant", "registration.proof", result.reg.title, { registrationId: result.reg.id, method: value.method }).catch(() => null);
  await alertAdmins(`Payment to check: ${result.reg.title}`, [
    `${result.reg.name} uploaded a ${payMethodLabel(value.method)} receipt (Ref ${value.reference}${value.amount ? `, ₱${value.amount}` : ""}).`,
    "Check it on the event's Registrations page in the admin.",
  ]).catch(() => null);
  return NextResponse.json({ ok: true, feeStatus: "review" }, { headers: noStore });
}
