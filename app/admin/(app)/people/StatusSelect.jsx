"use client";

import { useState } from "react";

/**
 * A row's follow-up status (design review, 17 Nov 2026): the Save button appears only once the status is changed,
 * instead of a Save on every row. The ConfirmButton passed as `children` still asks before saving.
 */
export default function StatusSelect({ id, name, value, options, children }) {
  const [now, setNow] = useState(value);
  return (
    <>
      <label className="visually-hidden" htmlFor={id}>Follow-up for {name}</label>
      <select id={id} name="status" value={now} onChange={(e) => setNow(e.target.value)}>
        {options.map((s) => <option key={s}>{s}</option>)}
      </select>
      {now !== value && <span className="person-quick-save">{children}<button type="button" className="linkish small" data-confirm="not-needed-read-only" onClick={() => setNow(value)}>Undo</button></span>}
    </>
  );
}
