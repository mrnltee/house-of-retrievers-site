"use client";

import { useEffect, useRef, useState } from "react";
import { resizeImage } from "../lib/resizeImage";
import { PAY_METHODS, READABLE, ticketLine } from "../lib/eventPayments.mjs";
import { PRIVACY_URL } from "../lib/siteSeo.mjs";

const peso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;

/**
 * Pay and upload proof (Figma P2): the amount, HOR's payment channels with
 * their QR, then the reference number and the confirmation screenshot.
 * "Send for checking" asks first (P2b) and only then uploads.
 *
 * `methods` are the approved channels (publicMethods); when not given they're
 * fetched from /api/support-details. `onSent` runs after a good upload.
 */
export default function PayStep({ code, ticketLabel, amount, methods: given, reason, paymentNotice = "All payments are non-refundable.", replacing = false, onSent }) {
  const [methods, setMethods] = useState(given || null);
  const [channel, setChannel] = useState(given?.[0]?.key || "");
  const [method, setMethod] = useState("");
  const [file, setFile] = useState(null);
  const [state, setState] = useState({ busy: false, error: "" });
  const [pending, setPending] = useState(null);
  const confirmRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (given) return;
    let live = true;
    fetch("/api/support-details", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!live) return;
        const list = Array.isArray(data?.methods) ? data.methods.filter((m) => PAY_METHODS[m.key]) : [];
        setMethods(list);
        setChannel(list[0]?.key || "");
      })
      .catch(() => live && setMethods([]));
    return () => { live = false; };
  }, [given]);

  const shown = methods?.find((m) => m.key === channel);

  async function pick(e) {
    const picked = e.target.files?.[0];
    if (!picked) return setFile(null);
    setState({ busy: true, error: "" });
    try {
      const resized = await resizeImage(picked);
      setFile({ name: picked.name, dataUrl: resized.dataUrl });
      setState({ busy: false, error: "" });
    } catch {
      setFile(null);
      setState({ busy: false, error: "That file didn't open as a picture. Try a PNG or JPG screenshot." });
    }
  }

  // First press: check the form, then ask (P2b). Nothing is sent until "Yes, send it".
  function review(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const details = { method: data.get("method"), reference: String(data.get("reference") || "").trim(), amount: String(data.get("amount") || "").trim() };
    if (!details.method) return setState({ busy: false, error: "Pick how you paid." });
    if (!details.reference) return setState({ busy: false, error: "Add the reference number from your receipt." });
    if (!file) return setState({ busy: false, error: "Add your confirmation screenshot." });
    setState({ busy: false, error: "" });
    setPending(details);
    confirmRef.current?.showModal();
  }

  async function send() {
    confirmRef.current?.close();
    setState({ busy: true, error: "" });
    try {
      const response = await fetch("/api/rsvp/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ...pending, image: file.dataUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "That didn't go through. Please try again.");
      setState({ busy: false, error: "" });
      onSent?.();
    } catch (error) {
      setState({ busy: false, error: error.message });
    }
  }

  return (
    <div className="pay-step">
      {reason && (
        <div className="pay-reason" role="note">
          <strong>From the team</strong>
          <p>{reason}</p>
        </div>
      )}
      {amount != null && (
        <div className="pay-amount">
          <div><span>{ticketLabel || "Your ticket"}</span><strong>{peso(amount)}</strong></div>
          <p>Pay the exact amount. If the app asks for a message, use <strong>{code.slice(0, 5)} {code.slice(5)}</strong>.</p>
        </div>
      )}

      <h3>1. Pay with one of these</h3>
      {methods === null ? (
        <p className="pay-muted">Loading the payment details…</p>
      ) : methods.length === 0 ? (
        <p className="pay-muted">The payment details aren't up yet. We&apos;ll message you how to pay. Please don&apos;t send money to anyone who contacts you about it first.</p>
      ) : (
        <>
          <div className="pay-channels" role="tablist" aria-label="Payment channels">
            {methods.map((m) => (
              <button key={m.key} type="button" role="tab" aria-selected={channel === m.key} className={channel === m.key ? "active" : ""} onClick={() => setChannel(m.key)}>{m.label}</button>
            ))}
          </div>
          {shown && (
            <div className="pay-channel" role="tabpanel">
              {shown.qrImage && <img src={shown.qrImage} alt={`${shown.label} QR code for ${shown.details.accountName || "House of Retrievers"}`} width="220" height="220" />}
              <strong>{shown.details.accountName}</strong>
              <span>{[shown.label, shown.details.number, shown.details.bankName, shown.details.accountNumber].filter(Boolean).join(" · ")}</span>
              {shown.qrImage && <a className="pay-link" href={shown.qrImage} download={`HOR-${shown.key}-QR.png`}>Save QR image</a>}
            </div>
          )}
        </>
      )}

      <h3>2. Upload your proof</h3>
      <form ref={formRef} onSubmit={review} className="pay-form">
        <label>Paid with
          <select name="method" value={method} onChange={(e) => setMethod(e.target.value)} required>
            <option value="">Choose…</option>
            {Object.entries(PAY_METHODS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label>Reference number
          <input name="reference" required maxLength={40} autoComplete="off" spellCheck={false} placeholder="e.g. 1012 345 678 901" />
          <span className="pay-hint">The Ref No. on your GCash, Maya or GoTyme receipt.</span>
        </label>
        <label>Amount you sent
          <input name="amount" inputMode="decimal" maxLength={12} defaultValue={amount ? String(amount) : ""} placeholder="e.g. 795" />
        </label>
        <label className="pay-upload">{replacing ? "New confirmation screenshot" : "Confirmation screenshot"}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} required={!file} />
          {file && <span className="pay-file">✓ {file.name}</span>}
        </label>
        <p className="pay-tip">{READABLE}</p>
        <p className="pay-norefund">{paymentNotice}</p>
        <p className="form-note">We keep your payment details and screenshot private and use them to confirm your payment. <a href={PRIVACY_URL} target="_blank" rel="noreferrer">Read our privacy notice.</a></p>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        <button className="button dark" type="submit" disabled={state.busy}>{state.busy ? "Sending…" : "Send for checking"}</button>
      </form>

      <dialog ref={confirmRef} className="pay-confirm" aria-labelledby={`pay-confirm-${code}`}>
        {pending && (
          <div>
            <p className="eyebrow">Check before sending</p>
            <h3 id={`pay-confirm-${code}`}>Send this for checking?</h3>
            <dl>
              {(ticketLabel || amount != null) && <div><dt>Ticket</dt><dd>{ticketLine(ticketLabel, amount)}</dd></div>}
              <div><dt>Paid with</dt><dd>{PAY_METHODS[pending.method]}</dd></div>
              <div><dt>Reference</dt><dd>{pending.reference.toUpperCase()}</dd></div>
              {pending.amount && <div><dt>Amount</dt><dd>₱{pending.amount}</dd></div>}
              <div><dt>Screenshot</dt><dd>{file?.name} ✓</dd></div>
            </dl>
            <p>The team matches the reference with HOR&apos;s payment history, then emails your QR pass. {paymentNotice}</p>
            <div className="pay-confirm-actions">
              <button type="button" className="button dark" onClick={send} autoFocus>Yes, send it</button>
              <button type="button" className="button events-button-outline" onClick={() => confirmRef.current?.close()}>Let me fix something</button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
