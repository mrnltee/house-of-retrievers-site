"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { HONEYPOT_FIELD } from "../lib/spamGuard.mjs";
import { NO_REFUND } from "../lib/eventPayments.mjs";
import { tierAvailable, tierWindow } from "../lib/prices.mjs";
import PayStep from "./PayStep";

const peso = (n) => (n === 0 ? "Free" : `₱${Number(n).toLocaleString("en-PH")}`);

/**
 * RSVP for one event. A free event links to the pass with the check-in QR.
 * A paid event (Figma P1–P2) asks for a ticket, holds the spot, then shows
 * the payment step; the QR pass is emailed once an admin approves.
 */
export default function RsvpModal({ event, onClose }) {
  const dialog = useRef(null);
  const openedAt = useRef(Date.now());
  const [under18, setUnder18] = useState(false);
  const [state, setState] = useState({ sending: false, error: "", result: null });
  const [proofSent, setProofSent] = useState(false);
  const waitlist = event.status === "full";
  // Tickets on sale now (an early bird rate drops off at its cutoff), keeping each one's place in the full list.
  const tickets = event.feeRequired && Array.isArray(event.tickets) ? event.tickets.map((t, i) => ({ ...t, i })).filter((t) => tierAvailable(t) && t.left !== 0) : [];
  const [ticket, setTicket] = useState(tickets.length === 1 ? tickets[0].i : -1);
  const chosen = tickets.find((t) => t.i === ticket);
  const passHref = (code) => `${typeof window !== "undefined" && window.location.pathname.startsWith("/events") ? "/events" : ""}/r/${code}`;

  useEffect(() => {
    const opener = document.activeElement;
    const node = dialog.current;
    node.querySelector("input, button")?.focus();
    const trap = (e) => {
      // A confirm dialog inside the modal handles its own keys.
      if (node.querySelector("dialog[open]")) return;
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const items = [...node.querySelectorAll("button, a[href], input, select")].filter((item) => item.getClientRects().length && !item.disabled);
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.removeEventListener("keydown", trap); opener?.focus?.(); };
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState({ sending: true, error: "", result: null });
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: event.slug,
          name: form.get("name"),
          email: form.get("email"),
          furbabyName: form.get("furbabyName"),
          photoConsent: form.get("photoConsent"),
          under18: form.get("under18") === "yes",
          guardianName: form.get("guardianName"),
          ticket: ticket >= 0 ? ticket : undefined,
          [HONEYPOT_FIELD]: form.get(HONEYPOT_FIELD),
          elapsedMs: Date.now() - openedAt.current,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "That didn't go through. Please try again.");
      setState({ sending: false, error: "", result: data });
    } catch (error) {
      setState({ sending: false, error: error.message, result: null });
    }
  }

  const done = state.result;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section ref={dialog} className="join-modal rsvp-modal" role="dialog" aria-modal="true" aria-labelledby="rsvp-title">
        <button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        {done && done.feeDue && done.code ? (
          proofSent ? (
            <div className="success-state" role="status">
              <div className="eyebrow">Payment under review</div>
              <h2 id="rsvp-title">Thanks! We&apos;ll check it.</h2>
              <p>Your spot is held. We&apos;ll email your QR pass as soon as the team has matched your payment.</p>
              <a className="button dark" href={passHref(done.code)}>Open my RSVP page <Icon name="arrow" size={16} /></a>
              <p className="form-note">Your RSVP page shows where things stand, and lets you replace the screenshot.</p>
            </div>
          ) : (
            <div role="status">
              <div className="eyebrow">Step 2 of 3 · Pay</div>
              <h2 id="rsvp-title">Your spot is held</h2>
              <p className="modal-lead">Pay, then upload your proof. Paying later? The link in your email brings you back here; your spot stays held.</p>
              <PayStep code={done.code} ticketLabel={done.ticket?.label} amount={done.ticket?.amount ?? null} onSent={() => setProofSent(true)} />
            </div>
          )
        ) : done ? (
          <div className="success-state" role="status">
            <div className="eyebrow">{done.status === "confirmed" ? "You're in" : "You're on the waitlist"}</div>
            <h2 id="rsvp-title">{event.title}</h2>
            <p>
              {done.status === "confirmed"
                ? "Open your confirmation and keep it handy. We scan its QR at the door. It's in your email too."
                : "If a slot opens up, someone from the pack will message you. Your link shows where you stand."}
            </p>
            {done.code && <a className="button dark" href={passHref(done.code)}>Open my confirmation <Icon name="arrow" size={16} /></a>}
            <p className="form-note">Save or screenshot that page. It&apos;s your check-in pass.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="eyebrow">{waitlist ? "Join the waitlist" : "RSVP"}</div>
            <h2 id="rsvp-title">{event.title}</h2>
            {waitlist && <p className="modal-lead">It&apos;s full right now. Add your name and we&apos;ll offer you a slot if one opens.</p>}
            <div className="join-trap" aria-hidden="true"><label>Website<input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" /></label></div>
            <label>Your name<input required name="name" maxLength={120} autoComplete="name" /></label>
            <label>Email<input required type="email" name="email" maxLength={200} autoComplete="email" spellCheck={false} /></label>
            <label>Furbaby&apos;s name (optional)<input name="furbabyName" maxLength={120} /></label>
            <fieldset className="furbaby-question">
              <legend>Are photos of you OK?</legend>
              <p className="furbaby-hint">We share event photos on Instagram and Facebook.</p>
              <div className="furbaby-options">
                <label><input type="radio" name="photoConsent" value="yes" required /> <span>Yes, that&apos;s fine</span></label>
                <label><input type="radio" name="photoConsent" value="no" /> <span>No photos of me</span></label>
              </div>
            </fieldset>
            <fieldset className="furbaby-question">
              <legend>Are you under 18?</legend>
              <div className="furbaby-options">
                <label><input type="radio" name="under18" value="no" defaultChecked onChange={() => setUnder18(false)} /> <span>No</span></label>
                <label><input type="radio" name="under18" value="yes" onChange={() => setUnder18(true)} /> <span>Yes, with a guardian</span></label>
              </div>
            </fieldset>
            {under18 && <label>Parent or guardian&apos;s name (they come with you)<input required name="guardianName" maxLength={120} /></label>}
            {tickets.length > 1 && (
              <fieldset className="furbaby-question ticket-question">
                <legend>Ticket</legend>
                <div className="ticket-options">
                  {tickets.map((t) => (
                    <label key={t.i} className={ticket === t.i ? "selected" : ""}>
                      <input type="radio" name="ticket" value={t.i} required checked={ticket === t.i} onChange={() => setTicket(t.i)} />
                      <span>{t.label || `Ticket ${t.i + 1}`}{(t.until || t.limit) && <small className="ticket-until">{[t.limit ? `First ${t.limit} registrants · ${t.left} left` : "", tierWindow(t)].filter(Boolean).join(" · ")}</small>}</span>
                      <strong>{peso(t.amount)}</strong>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {tickets.length === 1 && <p className="modal-lead">Ticket: {tickets[0].label ? `${tickets[0].label} · ` : ""}{peso(tickets[0].amount)}</p>}
            {!waitlist && event.feeRequired && <p className="form-note">{NO_REFUND} Your spot is held as soon as you send this; you pay next.</p>}
            {state.error && <p className="form-error" role="alert">{state.error}</p>}
            <p className="form-note">We only use this to run this event.</p>
            <button className="button dark" type="submit" disabled={state.sending}>{state.sending ? "Sending…" : waitlist ? "Join the waitlist" : event.feeRequired ? `Continue to payment${ticket >= 0 && tickets[ticket] ? ` · ${peso(tickets[ticket].amount)}` : ""}` : "Send my RSVP"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
