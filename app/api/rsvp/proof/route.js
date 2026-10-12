import { NextResponse } from "next/server";
import { hasDatabase, transaction } from "../../../lib/db";
import { normalizeCode } from "../../../lib/admin/registrations.mjs";
import { logActivity } from "../../../lib/admin/log";
import { alertAdmins } from "../../../lib/admin/notify";
import { clientIp, createRateLimiter } from "../../../lib/spamGuard.mjs";
import { UNPAID, payMethodLabel, readProofImage, validateProof } from "../../../lib/eventPayments.mjs";

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
      `SELECT r.id, r.name, r.status, r.fee_status, e.title, e.fee_required FROM registrations r JOIN events e ON e.id = r.event_id
        WHERE r.check_in_code = $1 FOR UPDATE OF r`,
      [code],
    );
    if (!reg) return { error: "We couldn't find that RSVP.", status: 404 };
    if (reg.status !== "confirmed" || !reg.fee_required) return { error: "This RSVP doesn't need a payment.", status: 409 };
    if (reg.fee_status === "paid") return { error: "Your payment is already confirmed. Your QR pass is on this page.", status: 409 };
    if (!UNPAID.includes(reg.fee_status)) return { error: "This RSVP doesn't need a payment.", status: 409 };
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
