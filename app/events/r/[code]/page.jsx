import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { hasDatabase, sql } from "../../../lib/db";
import { normalizeCode } from "../../../lib/admin/registrations.mjs";
import { publicMethods } from "../../../lib/admin/payments.mjs";
import { EVENTS_URL } from "../../../lib/eventsHost.mjs";
import { PAY_METHODS, passState, paymentNotice } from "../../../lib/eventPayments.mjs";
import PassPayment from "./PassPayment";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your RSVP | House of Retrievers PH", robots: { index: false, follow: false } };

function formatDay(value) {
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * The confirmation a person keeps: their check-in QR, where they stand on the
 * waitlist, or, on a paid event, the payment step until an admin approves it
 * (no QR before that).
 */
export default async function RsvpPass({ params }) {
  const { code: raw } = await params;
  const code = normalizeCode(raw);
  if (!code || !hasDatabase()) notFound();
  const [reg] = await sql(
    `SELECT r.id, r.name, r.status, r.fee_status, r.checked_in_at, r.created_at, r.event_id, r.consent_completed_at, r.consent_name,
       r.ticket_label, r.ticket_amount, r.amount_due, r.pay_method, r.pay_amount, r.fee_reference, r.proof_at, r.fee_note,
       e.title, e.date, e.start_time, e.end_time, e.venue, e.city, e.fee_required, e.cost, e.is_charity, e.onsite_payment, e.rsvp_form_config
     FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.check_in_code = $1 AND r.deleted_at IS NULL`,
    [code],
  );
  if (!reg) notFound();

  let position = null;
  if (reg.status === "waitlist") {
    const [{ ahead }] = await sql(
      "SELECT count(*)::int AS ahead FROM registrations WHERE event_id=$1 AND status='waitlist' AND deleted_at IS NULL AND created_at < $2",
      [reg.event_id, reg.created_at],
    );
    position = ahead + 1;
  }
  const state = passState(reg);
  const acknowledgementRequired = Boolean(reg.rsvp_form_config?.consentEnabled);
  const acknowledgementComplete = Boolean(reg.consent_completed_at);
  const canViewQr = state === "pass" && (!acknowledgementRequired || acknowledgementComplete);
  const paying = ["waiting", "review", "rejected"].includes(state);
  const methods = paying ? publicMethods(await sql("SELECT key, enabled, details, qr_image, updated_at FROM payment_methods")).filter((m) => PAY_METHODS[m.key]) : [];
  const qr = canViewQr
    ? await QRCode.toString(`${EVENTS_URL}/r/${code}`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0d0d0d", light: "#ffffff" } })
    : null;
  const firstName = reg.name.split(" ")[0];
  const time = [reg.start_time, reg.end_time].filter(Boolean).join("–");

  return (
    <main className="rsvp-pass">
      <a className="rsvp-pass-logo" href={EVENTS_URL}>
        <img src="/house-of-retrievers-logo-original.png" alt="The House of Retrievers Society Inc. — events" width="1396" height="564" />
      </a>
      <section className="rsvp-pass-card">
        <p className={`eyebrow pass-state pass-state-${state}`}>
          {state === "pass" ? (reg.checked_in_at ? "Checked in" : "You're in")
            : state === "waiting" ? "Payment pending · your spot is held"
              : state === "review" ? "Payment under review"
                : state === "rejected" ? "We need another look"
                  : state === "waitlist" ? "On the waitlist" : "Cancelled"}
        </p>
        <h1>{reg.title}</h1>
        <p className="rsvp-pass-when">{formatDay(reg.date)}{time ? ` · ${time}` : ""}<br />{[reg.venue, reg.city].filter(Boolean).join(", ")}</p>

        {state === "pass" && canViewQr && (
          <>
            <p>Hi {firstName}! {reg.fee_required && reg.fee_status === "paid" ? "Your payment is confirmed. " : ""}Show this QR at the door. A screenshot works too.</p>
            <div className="rsvp-pass-qr" role="img" aria-label={`Check-in QR code. Code ${code}`} dangerouslySetInnerHTML={{ __html: qr }} />
            <p className="rsvp-pass-code">Code <strong>{code.slice(0, 5)} {code.slice(5)}</strong></p>
          </>
        )}
        {state === "pass" && acknowledgementRequired && !acknowledgementComplete && (
          <div className="rsvp-pass-note">
            <p>Before you view your QR pass, please review and acknowledge the event guidelines.</p>
            <a className="button dark" href={`${EVENTS_URL}/r/${code}/consent`}>Review and acknowledge</a>
          </div>
        )}
        {state === "waiting" && <p>Hi {firstName}! Your spot is held. Pay below, then upload your reference number and confirmation screenshot. Your QR pass comes by email once the team has matched your payment.</p>}
        {state === "review" && <p>Thanks, {firstName}. Your spot is held. We&apos;ll email your QR pass as soon as the team has matched your payment.</p>}
        {state === "rejected" && <p>Your spot is still held, {firstName}. Please upload a new screenshot.</p>}
        {paying && (
          <PassPayment
            code={code}
            state={state}
            ticketLabel={reg.ticket_label || ""}
            amount={reg.amount_due ?? reg.ticket_amount ?? null}
            methods={methods}
            reason={reg.fee_note || ""}
            paymentNotice={paymentNotice(reg)}
            sent={{
              method: reg.pay_method,
              reference: reg.fee_reference || "",
              amount: reg.pay_amount,
              at: reg.proof_at ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(reg.proof_at)) : "",
            }}
          />
        )}
        {state === "waitlist" && <p>Hi {firstName}, you&apos;re number {position} on the waitlist. If a slot opens, someone from the pack will message you, and this page will show what to do next.</p>}
        {state === "cancelled" && <p>This registration was cancelled. Message us on Instagram or Facebook if that&apos;s a mistake.</p>}
        {reg.fee_required && state === "pass" && <p className="rsvp-pass-note">{paymentNotice(reg)}</p>}
        {acknowledgementRequired && state === "pass" && acknowledgementComplete && (
          <p className="rsvp-pass-note"><a className="button dark" href={`${EVENTS_URL}/r/${code}/consent`}>{reg.consent_completed_at ? "View acknowledgement" : "Complete event acknowledgement"}</a></p>
        )}
        <p className="rsvp-pass-note">Keep this link private: it&apos;s your pass. We use your details only to run this event.</p>
      </section>
    </main>
  );
}
