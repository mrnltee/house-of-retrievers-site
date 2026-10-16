import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { hasEnded } from "../../lib/eventTime.mjs";
import { hasDatabase, transaction } from "../../lib/db";
import { newCheckInCode, statusForNewRegistration, validateRsvp } from "../../lib/admin/registrations.mjs";
import { HONEYPOT_FIELD, RATE_LIMIT, checkFillTime, clientIp, createRateLimiter, isHoneypotTripped } from "../../lib/spamGuard.mjs";
import { eventTiers } from "../../lib/admin/events.mjs";
import { chooseTicket, owesPayment, readProofImage } from "../../lib/eventPayments.mjs";
import { formatOpens, opensLater } from "../../lib/rsvpOpens.mjs";
import { TICKET_COUNTS_SQL, countsFromRows, hasLimits } from "../../lib/ticketCounts.mjs";
import { sendPass, sendSpotHeld, sendWaitlisted } from "../../lib/passEmails";
import { calculateAmountDue, cleanAttendeeCounts, cleanPricingBasis, ticketLimitUnits } from "../../lib/registrationPricing.mjs";
import { tierLeft } from "../../lib/prices.mjs";
import { holdExpiresAt } from "../../lib/registrationHolds.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter(RATE_LIMIT);
const noStore = { "Cache-Control": "no-store" };
const fail = (message, status = 422) => NextResponse.json({ error: message }, { status, headers: noStore });

export async function POST(request) {
  if (!hasDatabase()) return fail("RSVPs open once the events system is switched on.", 503);
  const rate = limiter.hit(clientIp(request.headers));
  if (!rate.allowed) {
    return NextResponse.json({ error: "You've sent a few of these already. Please wait a few minutes." }, { status: 429, headers: { ...noStore, "Retry-After": String(rate.retryAfterSeconds) } });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Something went wrong with that request.", 400);
  }
  const fillTime = checkFillTime(body?.elapsedMs);
  // Bots get a normal-looking answer and nothing is saved.
  if (isHoneypotTripped(body?.[HONEYPOT_FIELD]) || fillTime === "too-fast") {
    return NextResponse.json({ status: "confirmed", code: null }, { headers: noStore });
  }
  if (fillTime === "missing") return fail("Please refresh the page and send the form again.", 400);

  const { value, error } = validateRsvp(body);
  if (error) return fail(error);
  const slug = typeof body?.slug === "string" ? body.slug.slice(0, 120) : "";

  try {
    const result = await transaction(async (tx) => {
      // Lock the event row so two people can't both take the last slot.
      const [event] = await tx.sql(
        `SELECT id, title, capacity, rsvp_open, registration, status, date, start_time, end_time, all_day, venue, city, fee_required, price_tiers, pricing_basis, included_furbabies_per_human, additional_furbaby_fee, cost, rsvp_opens_at, vaccination_record_required FROM events WHERE slug = $1 FOR UPDATE`,
        [slug],
      );
      if (!event || event.status !== "published" || event.registration !== "required") return { error: "This event isn't taking RSVPs.", status: 404 };
      if (!event.rsvp_open) return { error: "RSVPs for this event are closed.", status: 409 };
      const opensAt = event.rsvp_opens_at ? new Date(event.rsvp_opens_at).toISOString() : null;
      if (opensLater(opensAt)) return { error: `RSVPs open ${formatOpens(opensAt)} (Manila time). See you then!`, status: 409 };
      if (hasEnded({ date: String(event.date).slice(0, 10), startTime: event.start_time, endTime: event.end_time, allDay: event.all_day })) {
        return { error: "This event has already happened.", status: 409 };
      }
      const [duplicate] = await tx.sql(
        `SELECT id FROM registrations WHERE event_id=$1 AND deleted_at IS NULL
           AND lower(email)=lower($2) AND lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g'))=lower(regexp_replace(trim($3), '[[:space:]]+', ' ', 'g')) LIMIT 1`,
        [event.id, value.email, value.name],
      );
      if (duplicate) return { error: "This name and email are already registered for this event. Check the confirmation link, or message us to change it.", status: 409 };
      // The ticket they picked (paid events with several prices); one price needs no choice.
      const tiers = event.fee_required ? eventTiers(event) : [];
      // Tiers for the first N registrants: count under the event lock, so the 20th place goes once.
      const counts = hasLimits(tiers) ? countsFromRows(await tx.sql(TICKET_COUNTS_SQL, [event.id])) : {};
      const ticket = chooseTicket(tiers, body?.ticket, { counts });
      if (ticket.error) return { error: ticket.error, status: 422 };
      const attendees = cleanAttendeeCounts(body?.humanCount ?? 1, body?.furbabyCount ?? 0);
      if (attendees.error) return { error: attendees.error, status: 422 };
      const due = calculateAmountDue({ basis: cleanPricingBasis(event.pricing_basis), tier: ticket.value, humans: attendees.humans, furbabies: attendees.furbabies, includedFurbabiesPerHuman: event.included_furbabies_per_human, additionalFurbabyFee: event.additional_furbaby_fee });
      if (due.error) return { error: due.error, status: 422 };
      const selectedTier = tiers[Number(body?.ticket)];
      if (selectedTier?.limit) {
        const left = tierLeft(selectedTier, counts);
        const units = ticketLimitUnits(event.pricing_basis, selectedTier, attendees.humans, attendees.furbabies);
        if (units > left) return { error: `That rate has ${left} Early Bird ${left === 1 ? "slot" : "slots"} left, but this registration needs ${units}. Choose the next available rate.`, status: 409 };
      }
      const vaccination = event.vaccination_record_required && body?.vaccinationRecord
        ? readProofImage(body.vaccinationRecord, { label: "vaccination record photo" })
        : null;
      if (vaccination?.error) return { error: vaccination.error, status: 422 };
      const [{ count }] = await tx.sql("SELECT count(*)::int AS count FROM registrations WHERE event_id = $1 AND status = 'confirmed' AND deleted_at IS NULL AND (fee_status <> 'waiting' OR hold_expires_at IS NULL OR hold_expires_at > now())", [event.id]);
      const status = statusForNewRegistration({ capacity: event.capacity, confirmed: count });
      const code = newCheckInCode();
      // A paid RSVP gets a short payment window; once proof is under review it stays active.
      const feeStatus = status === "confirmed" && owesPayment(event.fee_required, ticket.value) ? "waiting" : "not_due";
      const holdExpiry = feeStatus === "waiting" ? holdExpiresAt() : null;
      const [row] = await tx.sql(
        `INSERT INTO registrations (event_id, name, email, furbaby_name, photo_consent, under_18, guardian_name, status, fee_status, hold_expires_at, check_in_code, ticket_label, ticket_amount, human_count, furbaby_count, amount_due)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
        [event.id, value.name, value.email, value.furbabyName, value.photoConsent, value.under18, value.guardianName, status, feeStatus, holdExpiry, code, ticket.value.label, ticket.value.amount, attendees.humans, attendees.furbabies, due.amount],
      );
      if (vaccination?.value) {
        const bytes = Buffer.from(vaccination.value.base64, "base64");
        await tx.sql(
          "INSERT INTO registration_vaccination_records (registration_id, mime, data, bytes) VALUES ($1, $2, $3, $4)",
          [row.id, vaccination.value.mime, bytes, bytes.length],
        );
      }
      return { id: row.id, status, code, feeStatus, holdExpiresAt: holdExpiry?.toISOString() || null, ticket: ticket.value, amountDue: due.amount, humanCount: attendees.humans, furbabyCount: attendees.furbabies };
    });
    if (result.error) return fail(result.error, result.status);
    // Email too, so it isn't lost when the tab closes: the pass, the "spot held, now pay" note, or the waitlist note.
    if (result.status === "waitlist") await sendWaitlisted(result.id);
    else if (result.feeStatus === "waiting") await sendSpotHeld(result.id);
    else await sendPass(result.id);
    revalidatePath("/events");
    return NextResponse.json({ status: result.status, code: result.code, feeDue: result.feeStatus === "waiting", holdExpiresAt: result.holdExpiresAt, ticket: result.ticket, amountDue: result.amountDue, humanCount: result.humanCount, furbabyCount: result.furbabyCount }, { headers: noStore });
  } catch (dbError) {
    if (dbError?.code === "23505") return fail("That registration already exists. Check the confirmation link, or message us to change it.", 409);
    return fail("We couldn't save that just now. Please try again.", 502);
  }
}
