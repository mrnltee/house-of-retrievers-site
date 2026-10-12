"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PayStep from "../../../components/PayStep";
import { NO_REFUND, PAY_METHODS, ticketLine } from "../../../lib/eventPayments.mjs";

const STEPS = ["RSVP sent", "Proof uploaded", "Payment checked", "QR pass emailed"];

/**
 * The payment part of the pass page (Figma P3 / P3b): pay and upload while
 * pending, "under review" with what they sent (and a way to replace it), or
 * the team's reason and a new upload when a receipt was turned back.
 */
export default function PassPayment({ code, state, ticketLabel, amount, methods, sent, reason }) {
  const router = useRouter();
  const [replacing, setReplacing] = useState(false);
  const done = () => { setReplacing(false); router.refresh(); };

  if (state === "review" && !replacing) {
    return (
      <div className="pass-payment">
        <ol className="pass-steps" aria-label="Where things stand">
          {STEPS.map((step, i) => (
            <li key={step} className={i < 2 ? "done" : i === 2 ? "now" : ""}>{step}{i === 2 ? " · in progress" : ""}</li>
          ))}
        </ol>
        <dl className="pass-sent">
          {(ticketLabel || amount != null) && <div><dt>Ticket</dt><dd>{ticketLine(ticketLabel, amount)}</dd></div>}
          <div><dt>Paid with</dt><dd>{PAY_METHODS[sent.method] || sent.method}</dd></div>
          <div><dt>Reference</dt><dd>{sent.reference}</dd></div>
          {sent.amount != null && <div><dt>Amount</dt><dd>₱{Number(sent.amount).toLocaleString("en-PH")}</dd></div>}
          {sent.at && <div><dt>Sent</dt><dd>{sent.at}</dd></div>}
        </dl>
        <button type="button" className="pass-link-button" onClick={() => setReplacing(true)}>Sent the wrong one? Replace screenshot</button>
        <p className="pass-small">{NO_REFUND}</p>
      </div>
    );
  }
  return (
    <div className="pass-payment">
      {state === "review" && <button type="button" className="pass-link-button" onClick={() => setReplacing(false)}>Keep what I sent</button>}
      <PayStep code={code} ticketLabel={ticketLabel} amount={amount} methods={methods} reason={state === "rejected" ? reason : ""} replacing={state !== "waiting"} onSent={done} />
    </div>
  );
}
