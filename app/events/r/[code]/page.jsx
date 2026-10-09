import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { hasDatabase, sql } from "../../../lib/db";
import { normalizeCode } from "../../../lib/admin/registrations.mjs";
import { publicMethods } from "../../../lib/admin/payments.mjs";
import { EVENTS_URL } from "../../../lib/eventsHost.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your RSVP | House of Retrievers PH", robots: { index: false, follow: false } };

function formatDay(value) {
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** The confirmation a person keeps: their check-in QR, or where they stand on the waitlist. */
export default async function RsvpPass({ params }) {
  const { code: raw } = await params;
  const code = normalizeCode(raw);
  if (!code || !hasDatabase()) notFound();
  const [reg] = await sql(
    `SELECT r.id, r.name, r.status, r.fee_status, r.checked_in_at, r.created_at, r.event_id,
       e.title, e.date, e.start_time, e.end_time, e.venue, e.city, e.fee_required, e.cost
     FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.check_in_code = $1`,
    [code],
  );
  if (!reg) notFound();

  let position = null;
  if (reg.status === "waitlist") {
    const [{ ahead }] = await sql(
      "SELECT count(*)::int AS ahead FROM registrations WHERE event_id=$1 AND status='waitlist' AND created_at < $2",
      [reg.event_id, reg.created_at],
    );
    position = ahead + 1;
  }
  const needsFee = reg.status === "confirmed" && reg.fee_required && reg.fee_status !== "paid";
  const methods = needsFee ? publicMethods(await sql("SELECT key, enabled, details, qr_image, updated_at FROM payment_methods")) : [];
  const qr = reg.status === "confirmed"
    ? await QRCode.toString(`${EVENTS_URL}/r/${code}`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0d0d0d", light: "#ffffff" } })
    : null;
  const firstName = reg.name.split(" ")[0];
  const time = [reg.start_time, reg.end_time].filter(Boolean).join("–");

  return (
    <main className="rsvp-pass">
      <a className="rsvp-pass-logo" href={EVENTS_URL}>
        <img src="/house-of-retrievers-logo-original.png" alt="House of Retrievers — events" width="1396" height="564" />
      </a>
      <section className="rsvp-pass-card">
        <p className="eyebrow">
          {reg.status === "confirmed" ? (reg.checked_in_at ? "Checked in" : "You're in") : reg.status === "waitlist" ? "On the waitlist" : "Cancelled"}
        </p>
        <h1>{reg.title}</h1>
        <p className="rsvp-pass-when">{formatDay(reg.date)}{time ? ` · ${time}` : ""}<br />{[reg.venue, reg.city].filter(Boolean).join(", ")}</p>

        {reg.status === "confirmed" && (
          <>
            <p>Hi {firstName}! Show this QR at the door. A screenshot works too.</p>
            <div className="rsvp-pass-qr" role="img" aria-label={`Check-in QR code. Code ${code}`} dangerouslySetInnerHTML={{ __html: qr }} />
            <p className="rsvp-pass-code">Code <strong>{code.slice(0, 5)} {code.slice(5)}</strong></p>
          </>
        )}
        {reg.status === "waitlist" && <p>Hi {firstName}, you&apos;re number {position} on the waitlist. If a slot opens, someone from the pack will message you, and this page will show your check-in QR.</p>}
        {reg.status === "cancelled" && <p>This registration was cancelled. Message us on Instagram or Facebook if that&apos;s a mistake.</p>}

        {needsFee && (
          <div className="rsvp-pass-fee">
            <h2>Fee{reg.cost ? `: ${reg.cost}` : ""}</h2>
            {methods.length ? (
              <>
                <p>Send it by one of these, and write <strong>{code}</strong> in the message so we can match it to you.</p>
                <ul>
                  {methods.map((m) => (
                    <li key={m.key}><strong>{m.label}</strong> · {[m.details.number, m.details.bankName, m.details.accountNumber].filter(Boolean).join(" · ")} · {m.details.accountName}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>We&apos;ll message you how to pay. Please don&apos;t send money to anyone who contacts you about it first.</p>
            )}
          </div>
        )}
        <p className="rsvp-pass-note">Keep this link private: it&apos;s your pass. We use your details only to run this event.</p>
      </section>
    </main>
  );
}
