/**
 * Sends one email through Resend. Needs RESEND_API_KEY and EMAIL_FROM
 * (falls back to ADMIN_ALERT_FROM); EMAIL_REPLY_TO is where replies go.
 * Until those are set it sends nothing and returns { skipped: true }, so
 * forms and RSVPs keep working without email. The From address must be on
 * the domain verified in Resend.
 */
export function emailReady() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.ADMIN_ALERT_FROM));
}

/**
 * `idempotencyKey` ("<event>/<id>") stops a retry from sending twice: Resend
 * returns the first result for the same key within 24 hours.
 */
export async function sendEmail({ to, subject, html, text, idempotencyKey }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.ADMIN_ALERT_FROM;
  if (!key || !from || !to) return { skipped: true };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": String(idempotencyKey).slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.warn("email not sent", response.status, (await response.text()).slice(0, 200));
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    console.warn("email not sent", error?.message);
    return { ok: false };
  }
}
