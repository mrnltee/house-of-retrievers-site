"use client";

import { useState } from "react";

/** The reason a registrant sees when asked for a new receipt: pick a ready one, then edit it if needed. */
export default function ReasonPicker({ reasons }) {
  const [text, setText] = useState("");
  const short = ["Can't read it", "Amount doesn't match", "Reference not found"];
  return (
    <div className="field">
      <span>Reason they&apos;ll see <small>Pick one, then change it if you like</small></span>
      <div className="actions" style={{ gap: 6 }}>
        {reasons.map((r, i) => <button key={r} type="button" className={`tag-badge${text === r ? " is-on" : ""}`} onClick={() => setText(r)}>{short[i] || `Reason ${i + 1}`}</button>)}
      </div>
      <textarea name="reason" rows={3} maxLength={400} required value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. We can't read the reference number. Please upload the receipt straight from your payment app." />
    </div>
  );
}
