"use client";

import { useState } from "react";
import { MAX_PROMO_CODES, cleanPromoCodes, normalizeCode } from "../../../lib/promoCodes.mjs";

const blank = { code: "", kind: "percent", percent: "", from: "", until: "", limit: "" };

/**
 * Promo codes for this event (events.promo_codes): a keyword people type when
 * they register, giving % off or one free hooman/furbaby/pair. Sent as JSON in
 * `promoCodes`; saveEvent checks it with cleanPromoCodes.
 */
export default function PromoCodesField({ initial = [], uses = {} }) {
  const [rows, setRows] = useState(initial.map((c) => ({ code: c.code, kind: c.kind, percent: c.percent ? String(c.percent) : "", from: c.from || "", until: c.until || "", limit: c.limit ? String(c.limit) : "" })));
  const update = (i, patch) => setRows(rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const parsed = cleanPromoCodes(rows);
  return (
    <div className="field promo-codes">
      <span>Promo codes <small>Optional · for paid tickets</small></span>
      <p className="small muted" style={{ margin: 0 }}>People type the code on the RSVP form. "1 free" takes one hooman, furbaby or pair off at the ticket&apos;s rate; the rest stay at the regular rate. Codes aren&apos;t shown on the public page.</p>
      {rows.length > 0 && <ul className="promo-list">
        {rows.map((row, i) => {
          const used = uses[normalizeCode(row.code)] || 0;
          return (
            <li key={i} className="card inset form" style={{ gap: 10 }}>
              <div className="row-2">
                <label className="field"><span>Keyword</span><input value={row.code} maxLength={30} placeholder="GOLDEN20" autoComplete="off" spellCheck={false} style={{ textTransform: "uppercase" }} onChange={(e) => update(i, { code: e.target.value })} aria-label={`Promo ${i + 1} keyword`} /></label>
                <label className="field"><span>Gives</span>
                  <select value={row.kind} onChange={(e) => update(i, { kind: e.target.value })} aria-label={`Promo ${i + 1} gives`}>
                    <option value="percent">% off the total</option>
                    <option value="free_one">1 free (one pass at the ticket&apos;s rate)</option>
                  </select>
                </label>
              </div>
              {row.kind === "percent" && <label className="field"><span>Discount</span><span className="peso-input"><input type="number" min={1} max={100} value={row.percent} onChange={(e) => update(i, { percent: e.target.value })} placeholder="20" aria-label={`Promo ${i + 1} percent off`} /><span aria-hidden="true">%</span></span></label>}
              <div className="row-2">
                <label className="field"><span>From <small>Optional, Manila date</small></span><input type="date" value={row.from} onChange={(e) => update(i, { from: e.target.value })} aria-label={`Promo ${i + 1} valid from`} /></label>
                <label className="field"><span>Until <small>Optional, last day it works</small></span><input type="date" value={row.until} onChange={(e) => update(i, { until: e.target.value })} aria-label={`Promo ${i + 1} valid until`} /></label>
              </div>
              <label className="field"><span>Times it can be used <small>Blank = no limit · one use per registration</small></span><input type="number" min={1} max={100000} value={row.limit} onChange={(e) => update(i, { limit: e.target.value })} placeholder="No limit" aria-label={`Promo ${i + 1} number of uses`} /></label>
              <p className="small muted" style={{ margin: 0 }} role="status">Used {used} {used === 1 ? "time" : "times"}{row.limit ? ` of ${row.limit}` : ""}.</p>
              <p className="small"><button type="button" className="linkish" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove this code</button></p>
            </li>
          );
        })}
      </ul>}
      {rows.length < MAX_PROMO_CODES && <p className="small"><button type="button" className="linkish" onClick={() => setRows([...rows, blank])}>+ Add a promo code</button></p>}
      {parsed.error && <p className="small" role="alert" style={{ color: "#9c2f2f", margin: 0 }}>{parsed.error}</p>}
      <input type="hidden" name="promoCodes" value={JSON.stringify(parsed.codes || rows)} />
    </div>
  );
}
