import { NextResponse } from "next/server";
import { hasDatabase, sql } from "../../../lib/db";
import { clientIp, createRateLimiter } from "../../../lib/spamGuard.mjs";
import { normalizeCode, promoLabel } from "../../../lib/promoCodes.mjs";
import { checkPromo } from "../../../lib/promoStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Looser than the RSVP's own limit: a mistyped code shouldn't lock someone out.
const limiter = createRateLimiter({ limit: 15, windowMs: 10 * 60 * 1000 });
const noStore = { "Cache-Control": "no-store" };
const fail = (message, status = 422) => NextResponse.json({ error: message }, { status, headers: noStore });

/**
 * "Apply" on the RSVP form: says whether a promo code works for this event now
 * and what it gives. The codes themselves are never sent to the page; the RSVP
 * checks the code again when it's saved.
 */
export async function POST(request) {
  if (!hasDatabase()) return fail("Promo codes aren't available right now.", 503);
  const rate = limiter.hit(clientIp(request.headers));
  if (!rate.allowed) return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429, headers: { ...noStore, "Retry-After": String(rate.retryAfterSeconds) } });
  let body;
  try { body = await request.json(); } catch { return fail("Something went wrong with that request.", 400); }
  const slug = typeof body?.slug === "string" ? body.slug.slice(0, 120) : "";
  if (!normalizeCode(body?.code)) return fail("Type a promo code first.");
  const [event] = await sql("SELECT id, fee_required, promo_codes FROM events WHERE slug = $1 AND status = 'published'", [slug]);
  if (!event?.fee_required) return fail("Promo codes are for paid tickets.");
  const checked = await checkPromo({ sql }, event.id, event.promo_codes, body.code);
  if (checked.error) return fail(checked.error);
  const { code, kind, percent } = checked.promo;
  return NextResponse.json({ code, kind, percent, label: promoLabel(checked.promo) }, { headers: noStore });
}
