"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { HONEYPOT_FIELD } from "../lib/spamGuard.mjs";
import { inOrderTiers, nextTierNote, paymentNotice } from "../lib/eventPayments.mjs";
import { tierAvailable, tierWindow } from "../lib/prices.mjs";
import { PUBLIC_MAX_FURBABIES, PUBLIC_MAX_HUMANS, calculateAmountDue, ticketLimitLine, ticketLimitUnits } from "../lib/registrationPricing.mjs";
import PayStep from "./PayStep";
import BreedSelect from "./BreedSelect";
import Stepper from "./Stepper";
import { joinFurbabyNames } from "../lib/attendeeNames.mjs";

/** The ticket value for "Join the dog waitlist" (not an index into the price list). */
const DOG_WAITLIST = -2;

import { PRIVACY_URL } from "../lib/siteSeo.mjs";
import { resizeImageWithin } from "../lib/resizeImage";
import { vaccinationBudget } from "../lib/vaccinationRecords.mjs";

const peso = (n) => (n === 0 ? "Free" : `₱${Number(n).toLocaleString("en-PH")}`);

/**
 * RSVP for one event. A free event links to the pass with the check-in QR.
 * A paid event (Figma P1–P2) asks for a ticket, holds the spot, then shows
 * the payment step; the QR pass is emailed once an admin approves.
 */
/** `preview`: the admin editor draws the real form inline (no backdrop, no focus trap) and nothing is sent. */
export default function RsvpModal({ event, onClose, preview = false }) {
  const dialog = useRef(null);
  const openedAt = useRef(Date.now());
  const [under18, setUnder18] = useState(false);
  const [humanCount, setHumanCount] = useState(1);
  const [guestNames, setGuestNames] = useState([]);
  const [furbabyNames, setFurbabyNames] = useState([]);
  const [yourName, setYourName] = useState("");
  const [furbabyCount, setFurbabyCount] = useState(1);
  const [state, setState] = useState({ sending: false, error: "", result: null });
  const [breeds, setBreeds] = useState([]);
  const [proofSent, setProofSent] = useState(false);
  const [holdRemaining, setHoldRemaining] = useState(null);
  const waitlist = event.status === "full";
  // Tickets on sale now (an early bird rate drops off at its cutoff), keeping each one's place in the full list.
  const ticketsOnSale = event.feeRequired && Array.isArray(event.tickets) ? event.tickets.map((t, i) => ({ ...t, i })).filter((t) => tierAvailable(t) && t.left !== 0 && (!t.limit || ticketLimitUnits(event.pricingBasis, t, Number(humanCount) || 1, Number(furbabyCount) || 0) <= t.left)) : [];
  // "Offer prices in order": only the first ticket still on sale, with a note on what comes next.
  const tickets = event.ticketsInOrder ? inOrderTiers(ticketsOnSale) : ticketsOnSale;
  const nextNote = event.ticketsInOrder && tickets[0] ? nextTierNote(event.tickets, tickets[0].i) : "";
  // The dog waitlist: offered beside Hooman only once every ticket with a furbaby is sold out.
  const offerDogWaitlist = Boolean(event.dogWaitlistOpen);
  const [ticket, setTicket] = useState(tickets.length === 1 && !offerDogWaitlist ? tickets[0].i : -1);
  const onDogWaitlist = offerDogWaitlist && ticket === DOG_WAITLIST;
  const chosen = tickets.find((t) => t.i === ticket);
  const due = chosen ? calculateAmountDue({ basis: event.pricingBasis, tier: chosen, humans: humanCount, furbabies: furbabyCount, includedFurbabiesPerHuman: event.includedFurbabiesPerHuman, additionalFurbabyFee: event.additionalFurbabyFee }) : null;
  // Use the selected ticket rule directly. This keeps the public form correct even
  // when older event rows carry a legacy pricing-basis value.
  const humanOnly = chosen?.attendanceBasis === "human_only";
  const furbabyPackage = event.pricingBasis === "tiered" && chosen?.attendanceBasis === "furbaby_package";
  const formConfig = event.rsvpFormConfig || { optional: ["photoConsent", "under18"] };
  const askVaccination = Boolean(event.vaccinationRecordRequired && formConfig.optional.includes("vaccination"));
  const passHref = (code) => `${typeof window !== "undefined" && window.location.pathname.startsWith("/events") ? "/events" : ""}/r/${code}`;

  useEffect(() => {
    const expiresAt = state.result?.holdExpiresAt;
    if (!expiresAt) { setHoldRemaining(null); return undefined; }
    const update = () => setHoldRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [state.result?.holdExpiresAt]);

  function selectTicket(nextTicket) {
    const next = tickets.find((item) => item.i === nextTicket);
    setTicket(nextTicket);
    if (nextTicket === DOG_WAITLIST) { if (Number(furbabyCount) < 1) setFurbabyCount(1); return; }
    if (event.pricingBasis === "base_plus") {
      if (next?.attendanceBasis === "human_only") setFurbabyCount(0);
      else if (Number(furbabyCount) < 1) setFurbabyCount(1);
      return;
    }
    if (event.pricingBasis !== "tiered") return;
    if (next?.attendanceBasis === "human_only") setFurbabyCount(0);
    if (next?.attendanceBasis === "furbaby_package" && Number(furbabyCount) < 1) setFurbabyCount(1);
  }

  function ticketRuleNote(ticketOption) {
    if (event.pricingBasis === "base_plus" && ticketOption.attendanceBasis === "human_only") return "Hooman only · per hooman · no furbaby";
    if (event.pricingBasis === "base_plus") {
      const h = Number(ticketOption.extraHumanFee || 0);
      const f = Number(ticketOption.extraFurbabyFee || 0);
      return `${peso(ticketOption.amount)} per pair (1 hooman + 1 furbaby)${h ? ` · ${peso(h)} per extra hooman` : ""}${f ? ` · ${peso(f)} per extra furbaby` : ""}`;
    }
    if (event.pricingBasis !== "tiered") return "";
    if (ticketOption.attendanceBasis === "human_only") return "Hooman only · no furbabies";
    const included = ticketOption.includedHumansPerFurbaby || 2;
    const extra = Number(ticketOption.additionalHumanFee || 0);
    return `Includes up to ${included} ${included === 1 ? "person" : "people"} per furbaby${extra ? ` · ${peso(extra)} per extra person` : ""}`;
  }

  useEffect(() => {
    if (preview) return undefined;
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
  }, [onClose, preview]);

  // A single Furbaby package has no radio change to initialise the dog count.
  useEffect(() => {
    if (humanOnly && Number(furbabyCount) !== 0) setFurbabyCount(0);
    if (furbabyPackage && Number(furbabyCount) < 1) setFurbabyCount(1);
  }, [humanOnly, furbabyPackage, furbabyCount]);

  async function submit(e) {
    e.preventDefault();
    if (preview) { setState({ sending: false, error: "This is a preview. Nothing was sent.", result: null }); return; }
    const form = new FormData(e.currentTarget);
    setState({ sending: true, error: "", result: null });
    try {
      // One optional vaccination photo per furbaby row, shrunk so they all fit in one request.
      const dogTotal = Number(form.get("furbabyCount")) || 0;
      const picks = Array.from({ length: dogTotal }, (_, i) => form.get(`vaccinationRecord${i}`)).map((f) => (f instanceof File && f.size ? f : null));
      const budget = vaccinationBudget(picks.filter(Boolean).length);
      const vaccinationRecords = askVaccination ? await Promise.all(picks.map(async (f) => (f ? (await resizeImageWithin(f, budget)).dataUrl : null))) : [];
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: event.slug,
          name: form.get("name"),
          email: form.get("email"),
          furbabyName: joinFurbabyNames(furbabyNames, Number(form.get("furbabyCount")) || 0),
          customAnswers: Object.fromEntries((formConfig.questions || []).map((q) => [q.id, form.get(`custom_${q.id}`)])),
          guestNames: guestNames.slice(0, Math.max(0, (Number(form.get("humanCount")) || 1) - 1)),
          humanCount: form.get("humanCount"),
          furbabyCount: form.get("furbabyCount"),
          furbabyBreeds: breeds.slice(0, Number(form.get("furbabyCount")) || 0),
          photoConsent: form.get("photoConsent"),
          under18: form.get("under18") === "yes",
          guardianName: form.get("guardianName"),
          vaccinationRecords,
          ticket: ticket >= 0 ? ticket : undefined,
          dogWaitlist: onDogWaitlist || undefined,
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
    <div className={preview ? "rsvp-preview" : "modal-backdrop"} role="presentation" onMouseDown={(e) => !preview && e.target === e.currentTarget && onClose()}>
      <section ref={dialog} className={`join-modal rsvp-modal${preview ? " is-preview" : ""}`} role={preview ? "region" : "dialog"} aria-modal={preview ? undefined : "true"} aria-labelledby="rsvp-title">
        {!preview && <button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>}
        {done && done.feeDue && done.code ? (
          proofSent ? (
            <div className="success-state" role="status">
              <div className="eyebrow">Payment under review</div>
              <h2 id="rsvp-title">Thanks! We&apos;ll check it.</h2>
              <p>Your payment proof is with the team. We&apos;ll email your QR pass as soon as it is matched.</p>
              <a className="button dark" href={passHref(done.code)}>Open my RSVP page <Icon name="arrow" size={16} /></a>
              <p className="form-note">Your RSVP page shows where things stand, and lets you replace the screenshot.</p>
            </div>
          ) : (
            <div role="status">
              <div className="eyebrow">Step 2 of 3 · Pay</div>
              <h2 id="rsvp-title">Your spot is held</h2>
              {holdRemaining > 0 ? <p className="hold-countdown" role="timer">Please send your payment proof within <strong>{Math.floor(holdRemaining / 60000)}:{String(Math.floor((holdRemaining % 60000) / 1000)).padStart(2, "0")}</strong>.</p> : <p className="form-error" role="alert">This payment hold has expired. Please close this window and start again so someone else can use the slot.</p>}
              {holdRemaining > 0 && <p className="modal-lead">Pay, then upload your proof. Your payment link will remain available after you send it for checking.</p>}
              {holdRemaining > 0 && <PayStep code={done.code} ticketLabel={done.ticket?.label} amount={done.amountDue ?? done.ticket?.amount ?? null} paymentNotice={paymentNotice(event)} onSent={() => setProofSent(true)} />}
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
            {event.feeRequired && tickets.length + (offerDogWaitlist ? 1 : 0) > 1 && (
              <fieldset className="furbaby-question ticket-question">
                <legend>Choose your ticket</legend>
                <p className="furbaby-hint">This decides what is included and how your amount is calculated.</p>
                <div className="ticket-options">
                  {tickets.map((t) => {
                    const ticketDue = calculateAmountDue({ basis: event.pricingBasis, tier: t, humans: humanCount, furbabies: furbabyCount, includedFurbabiesPerHuman: event.includedFurbabiesPerHuman, additionalFurbabyFee: event.additionalFurbabyFee });
                    return <label key={t.i} className={ticket === t.i ? "selected" : ""}>
                      <input type="radio" name="ticket" value={t.i} required checked={ticket === t.i} onChange={() => selectTicket(t.i)} />
                      <span>{t.label || `Ticket ${t.i + 1}`}{ticketRuleNote(t) && <small className="ticket-until">{ticketRuleNote(t)}</small>}{(t.until || t.limit) && <small className="ticket-until">{[t.limit ? ticketLimitLine(event.pricingBasis, t, t.left) : "", tierWindow(t)].filter(Boolean).join(" · ")}</small>}</span>
                      <strong>{ticketDue.error ? peso(t.amount) : peso(ticketDue.amount)}</strong>
                    </label>;
                  })}
                  {offerDogWaitlist && <label className={onDogWaitlist ? "selected" : ""}>
                    <input type="radio" name="ticket" value={DOG_WAITLIST} required checked={onDogWaitlist} onChange={() => selectTicket(DOG_WAITLIST)} />
                    <span>Join the dog waitlist<small className="ticket-until">Dog slots are full. No payment now: we&apos;ll message you if a slot opens.</small></span>
                    <strong>—</strong>
                  </label>}
                </div>
              </fieldset>
            )}
            {event.feeRequired && tickets.length === 1 && !offerDogWaitlist && <div className="rsvp-ticket-summary"><span>Ticket</span><strong>{tickets[0].label || "Standard ticket"}</strong><small>{ticketRuleNote(tickets[0]) || "Your event ticket"}</small>{tickets[0].limit ? <small className="ticket-until">{ticketLimitLine(event.pricingBasis, tickets[0], tickets[0].left)}</small> : null}{nextNote && <small className="ticket-next">{nextNote}</small>}</div>}
            <label>Your name<input required name="name" maxLength={120} autoComplete="name" value={yourName} onChange={(e) => setYourName(e.target.value)} /></label>
            <label>Email<input required type="email" name="email" maxLength={200} autoComplete="email" spellCheck={false} /></label>
            {(() => {
              const maxHumans = event.maxHumansPerFurbaby && Number(furbabyCount) > 0 ? event.maxHumansPerFurbaby * Number(furbabyCount) : PUBLIC_MAX_HUMANS;
              const maxDogs = event.maxFurbabiesPerRegistration || PUBLIC_MAX_FURBABIES;
              const humans = Math.min(Number(humanCount) || 0, maxHumans);
              const dogs = humanOnly ? 0 : Math.min(Number(furbabyCount) || 0, maxDogs);
              const setAt = (setter, i, v) => setter((list) => { const next = [...list]; next[i] = v; return next; });
              return <>
                <Stepper label="Hoomans attending" name="humanCount" value={humanCount} min={1} max={maxHumans} onChange={setHumanCount} />
                <div className="rsvp-people">
                  {Array.from({ length: humans }, (_, i) => i === 0
                    ? <label key={i}>Hooman 1 (you)<input value={yourName} readOnly tabIndex={-1} placeholder="Your name, above" aria-readonly="true" /></label>
                    : <label key={i}>Hooman {i + 1} name (optional)<input maxLength={120} autoComplete="off" value={guestNames[i - 1] || ""} onChange={(e) => setAt(setGuestNames, i - 1, e.target.value)} /></label>)}
                </div>
                {!humanOnly && <Stepper label="Furbabies attending" name="furbabyCount" value={furbabyCount} min={event.pricingBasis === "furbaby" || furbabyPackage ? 1 : 0} max={maxDogs} onChange={setFurbabyCount} />}
                {dogs > 0 && <div className={`rsvp-people${askVaccination ? " with-vaccination" : ""}`}>
                  {Array.from({ length: dogs }, (_, i) => (
                    <div key={i} className="rsvp-furbaby-row">
                      <label>{askVaccination ? (dogs > 1 ? `Furbaby ${i + 1} name` : "Furbaby name") : dogs > 1 ? `Furbaby ${i + 1} name (optional)` : "Furbaby name (optional)"}<input maxLength={60} placeholder="e.g. Mochi" value={furbabyNames[i] || ""} onChange={(e) => setAt(setFurbabyNames, i, e.target.value)} /></label>
                      <BreedSelect name={`furbabyBreed${i}`} label={askVaccination ? "Breed" : dogs > 1 ? `Furbaby ${i + 1} breed (optional)` : "Breed (optional)"} value={breeds[i] || ""} onChange={(key) => setAt(setBreeds, i, key)} />
                      {askVaccination && <label className="rsvp-vaccination">Vaccination card<input type="file" name={`vaccinationRecord${i}`} accept="image/jpeg,image/png,image/webp" required={Boolean(formConfig.vaccinationRequired)} /></label>}
                    </div>
                  ))}
                  {askVaccination && <p className="form-note" style={{ textAlign: "left", margin: 0 }}>{formConfig.vaccinationRequired ? <>A clear photo of each furbaby&apos;s vaccination card is required. Name and breed are optional. Only authorised HOR admins can view the cards.</> : <>Name, breed and vaccination card are all optional. If you have it handy, add a clear photo of each furbaby&apos;s card; only authorised HOR admins can view them.</>}</p>}
                </div>}
              </>;
            })()}
            {(event.maxFurbabiesPerRegistration || event.maxHumansPerFurbaby) && !humanOnly && (
                <p className="form-note">{[event.maxFurbabiesPerRegistration ? `Up to ${event.maxFurbabiesPerRegistration} ${event.maxFurbabiesPerRegistration === 1 ? "furbaby" : "furbabies"} per RSVP` : "", event.maxHumansPerFurbaby ? `up to ${event.maxHumansPerFurbaby} ${event.maxHumansPerFurbaby === 1 ? "person" : "people"} per furbaby` : ""].filter(Boolean).join(", ")}.</p>
              )}
            {(formConfig.questions || []).map((q) => (
              <fieldset key={q.id} className="furbaby-question custom-question">
                <legend>{q.label}</legend>
                <div className="custom-question-choices">
                  <label className="check"><input type="radio" name={`custom_${q.id}`} value="yes" required /> Yes</label>
                  <label className="check"><input type="radio" name={`custom_${q.id}`} value="no" /> No</label>
                </div>
              </fieldset>
            ))}
            {furbabyPackage && <p className="form-note">{ticketRuleNote(chosen)}</p>}
            {event.feeRequired && chosen && due?.amount != null && <div className="rsvp-total" role="status"><span>Your registration</span><strong>{peso(due.amount)}</strong>{chosen.limit ? (() => { const used = ticketLimitUnits(event.pricingBasis, chosen, Number(humanCount) || 1, Number(furbabyCount) || 0); return <small>Uses {used} of the {chosen.left} {chosen.label || "limited"} {chosen.left === 1 ? "place" : "places"} left</small>; })() : null}</div>}
            {formConfig.optional.includes("photoConsent") && <fieldset className="furbaby-question">
              <legend>Are photos of you OK?</legend>
              <p className="furbaby-hint">We share event photos on Instagram and Facebook.</p>
              <div className="furbaby-options">
                <label><input type="radio" name="photoConsent" value="yes" required /> <span>Yes, that&apos;s fine</span></label>
                <label><input type="radio" name="photoConsent" value="no" /> <span>No photos of me</span></label>
              </div>
            </fieldset>}
            {formConfig.optional.includes("under18") && <fieldset className="furbaby-question">
              <legend>Are you under 18?</legend>
              <div className="furbaby-options">
                <label><input type="radio" name="under18" value="no" defaultChecked onChange={() => setUnder18(false)} /> <span>No</span></label>
                <label><input type="radio" name="under18" value="yes" onChange={() => setUnder18(true)} /> <span>Yes, with a guardian</span></label>
              </div>
            </fieldset>}
            {under18 && formConfig.optional.includes("under18") && <label>Parent or guardian&apos;s name (they come with you)<input required name="guardianName" maxLength={120} /></label>}
            {!waitlist && !onDogWaitlist && event.feeRequired && <p className="form-note">{paymentNotice(event)} Your spot is held as soon as you send this; you pay next.</p>}
            {state.error && <p className="form-error" role="alert">{state.error}</p>}
            <p className="form-note">We only use this to run this event. <a href={PRIVACY_URL} target="_blank" rel="noreferrer">Read our privacy notice.</a></p>
            <button className="button dark" type="submit" disabled={state.sending}>{state.sending ? "Sending…" : waitlist ? "Join the waitlist" : onDogWaitlist ? "Join the dog waitlist" : event.feeRequired ? `Continue to payment${due?.amount != null ? ` · ${peso(due.amount)}` : ""}` : event.rsvpLabel || "Send my RSVP"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
