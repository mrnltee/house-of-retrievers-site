import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { hasDatabase, transaction } from "../../lib/db";
import { newCheckInCode, statusForNewRegistration, validateRsvp } from "../../lib/admin/registrations.mjs";
import { HONEYPOT_FIELD, RATE_LIMIT, checkFillTime, clientIp, createRateLimiter, isHoneypotTripped } from "../../lib/spamGuard.mjs";
import { sendEmail } from "../../lib/email";
import { rsvpConfirmed } from "../../lib/emailTemplates.mjs";
import { EVENTS_URL } from "../../lib/eventsHost.mjs";

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
        `SELECT id, title, capacity, rsvp_open, registration, status, date, start_time, end_time, venue, city, fee_required FROM events WHERE slug = $1 FOR UPDATE`,
        [slug],
      );
      if (!event || event.status !== "published" || event.registration !== "required") return { error: "This event isn't taking RSVPs.", status: 404 };
      if (!event.rsvp_open) return { error: "RSVPs for this event are closed.", status: 409 };
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
      if (String(event.date).slice(0, 10) < today) return { error: "This event has already happened.", status: 409 };
      const [{ count }] = await tx.sql("SELECT count(*)::int AS count FROM registrations WHERE event_id = $1 AND status = 'confirmed'", [event.id]);
      const status = statusForNewRegistration({ capacity: event.capacity, confirmed: count });
      const code = newCheckInCode();
      await tx.sql(
        `INSERT INTO registrations (event_id, name, email, furbaby_name, photo_consent, under_18, guardian_name, status, fee_status, check_in_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
           CASE WHEN $8 = 'confirmed' AND (SELECT fee_required FROM events WHERE id = $1) THEN 'waiting' ELSE 'not_due' END, $9)`,
        [event.id, value.name, value.email, value.furbabyName, value.photoConsent, value.under18, value.guardianName, status, code],
      );
      return { status, code, event };
    });
    if (result.error) return fail(result.error, result.status);
    // Their pass by email too, so it isn't lost when the tab closes.
    const { event } = result;
    const mail = rsvpConfirmed({
      name: value.name,
      status: result.status,
      feeRequired: event.fee_required,
      passUrl: `${EVENTS_URL}/r/${result.code}`,
      event: { title: event.title, date: String(event.date).slice(0, 10), startTime: event.start_time || undefined, endTime: event.end_time || undefined, venue: event.venue, city: event.city },
    });
    await sendEmail({ to: value.email, ...mail, idempotencyKey: `rsvp/${result.code}` }).catch(() => null);
    revalidatePath("/events");
    return NextResponse.json({ status: result.status, code: result.code }, { headers: noStore });
  } catch (dbError) {
    if (dbError?.code === "23505") return fail("That email is already registered for this event. Check your confirmation link, or message us to change it.", 409);
    return fail("We couldn't save that just now. Please try again.", 502);
  }
}
