import { NextResponse } from "next/server";
import { emailReady, sendEmail } from "../../lib/email";
import { MEDIA_MESSAGE_TO, cleanMediaMessage, mediaMessageEmail } from "../../lib/mediaMessage.mjs";
import { HONEYPOT_FIELD, RATE_LIMIT, checkFillTime, clientIp, createRateLimiter, isHoneypotTripped } from "../../lib/spamGuard.mjs";

// The media hub's message form: one email to HOR's Gmail, reply-to the sender. Same spam guard as Join.
const limiter = createRateLimiter(RATE_LIMIT);
const noStore = { "Cache-Control": "no-store" };
const SORRY = `We couldn't send that just now. Please email us at ${MEDIA_MESSAGE_TO}.`;

export async function POST(request) {
  if (!emailReady()) return NextResponse.json({ error: SORRY }, { status: 503, headers: noStore });

  const rate = limiter.hit(clientIp(request.headers));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "You've sent a few of these already. Please wait a few minutes and try again." },
      { status: 429, headers: { ...noStore, "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Something went wrong with that request." }, { status: 400, headers: noStore });
  }

  // Bots: answer as if it worked, send nothing.
  const fillTime = checkFillTime(body?.elapsedMs);
  if (isHoneypotTripped(body?.[HONEYPOT_FIELD]) || fillTime === "too-fast") return NextResponse.json({ ok: true }, { headers: noStore });
  if (fillTime === "missing") return NextResponse.json({ error: "Please refresh the page and send the form again." }, { status: 400, headers: noStore });

  const checked = cleanMediaMessage(body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400, headers: noStore });

  const sent = await sendEmail({ to: MEDIA_MESSAGE_TO, replyTo: checked.value.email, ...mediaMessageEmail(checked.value) });
  if (!sent?.ok) return NextResponse.json({ error: SORRY }, { status: 502, headers: noStore });
  return NextResponse.json({ ok: true }, { headers: noStore });
}
