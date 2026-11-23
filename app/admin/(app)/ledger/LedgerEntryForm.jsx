"use client";

import { useState } from "react";
import { removeLedgerEntry, removeLedgerFile, saveLedgerEntry } from "../../ledgerActions";
import { CATEGORIES, LEDGER_KINDS, LEDGER_LIMITS, LEDGER_METHODS, needsProof } from "../../../lib/ledger.mjs";
import ConfirmButton from "../ConfirmButton";
import ProofPicker from "./ProofPicker";

const PARTY = { expense: "Paid to", income: "From", in_kind: "Given by", turnover: "Beneficiary" };
const AMOUNT = { expense: "Amount (₱)", income: "Amount (₱)", in_kind: "Estimated value (₱)", turnover: "Amount (₱)" };
const PROOF = {
  expense: ["Receipt", "Official receipt, invoice, or a screenshot of the payment."],
  turnover: ["Proof of handover", "The beneficiary's acknowledgement receipt, or a photo of the handover."],
  income: ["Proof", "Optional: a deposit slip or screenshot."],
  in_kind: ["Photo or document", "Optional: a photo of the items or the giver's note."],
};

/**
 * One ledger line's form, for adding or editing (owner, 22 Nov 2026). `kinds` are the kinds this window
 * offers (one for Expense and Turnover, two for "In-kind or income"); the fields follow the chosen kind.
 * Existing receipts list with View and Remove (an expense's or turnover's last proof stays).
 */
export default function LedgerEntryForm({ entry = null, kinds, events, beneficiaries, files = [], base, back, today, eventId = "" }) {
  const [kind, setKind] = useState(entry?.kind || kinds[0]);
  const [category, setCategory] = useState(entry?.category || "");
  const [saved, setSaved] = useState(files);
  const [confirming, setConfirming] = useState("");
  const [message, setMessage] = useState("");
  const goods = kind === "turnover" && category === "goods";
  const fixedBeneficiary = entry?.beneficiary_id || "";
  const [label, hint] = PROOF[kind];

  async function removeFile(id) {
    setConfirming("");
    const data = new FormData();
    data.set("id", id);
    const result = await removeLedgerFile(data).catch(() => ({ error: "Couldn't remove it. Try again." }));
    if (result?.error) setMessage(result.error);
    else { setSaved((now) => now.filter((f) => f.id !== id)); setMessage("Removed."); }
  }

  return (
    <form action={saveLedgerEntry} className="form ledger-form">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="back" value={back} />
      {kinds.length > 1 ? (
        <fieldset className="ledger-kind">
          <legend className="small strong">This is</legend>
          <div className="segmented">
          {kinds.map((k) => (
            <label key={k} className={kind === k ? "is-on" : undefined}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => { setKind(k); setCategory(""); }} />
              <span>{LEDGER_KINDS.find(([key]) => key === k)[1]}</span>
            </label>
          ))}
          </div>
        </fieldset>
      ) : <input type="hidden" name="kind" value={kind} />}
      <div className="row-3">
        <label className="field"><span>Event</span>
          <select name="event" defaultValue={entry ? entry.event_id || "" : eventId}>
            <option value="">Not tied to an event</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}{e.date ? ` · ${e.date}` : ""}</option>)}
          </select>
        </label>
        <label className="field"><span>Date</span><input type="date" name="date" required defaultValue={entry?.entry_date || today} /></label>
        <label className="field"><span>Category</span>
          <select name="category" required value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="" disabled>Choose…</option>
            {CATEGORIES[kind].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
      </div>
      <label className="field"><span>{kind === "expense" ? "What it was for" : "Description"}</span>
        <input name="description" required maxLength={LEDGER_LIMITS.description} defaultValue={entry?.description || ""} placeholder={{ expense: "Tarpaulin and standees", income: "Donation box at the venue", in_kind: "Dog treats", turnover: "Event proceeds" }[kind]} />
      </label>
      <div className={kind === "in_kind" ? "row-3" : "row-2"}>
        {kind === "turnover" ? (
          <label className="field"><span>{PARTY[kind]}</span>
            <select name="beneficiary" required defaultValue={fixedBeneficiary}>
              <option value="" disabled>Choose…</option>
              {beneficiaries.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        ) : (
          <label className="field"><span>{PARTY[kind]} {kind !== "expense" && <small>Optional</small>}</span><input name="party" maxLength={LEDGER_LIMITS.party} defaultValue={entry?.party || ""} /></label>
        )}
        <label className="field"><span>{AMOUNT[kind]} {kind === "in_kind" && <small>Optional</small>}</span><input name="amount" inputMode="numeric" required={kind !== "in_kind"} defaultValue={entry?.amount ?? ""} placeholder="2450" /></label>
        {kind === "in_kind" && <label className="field"><span>Quantity <small>Optional</small></span><input name="quantity" maxLength={LEDGER_LIMITS.quantity} defaultValue={entry?.quantity || ""} placeholder="20 packs" /></label>}
      </div>
      {kind !== "in_kind" && !goods && (
        <div className="row-2">
          <label className="field"><span>Paid by</span>
            <select name="method" defaultValue={entry?.method || ""}><option value="">Not set</option>{LEDGER_METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          <label className="field"><span>Reference no. <small>Optional</small></span><input name="reference" maxLength={LEDGER_LIMITS.reference} defaultValue={entry?.reference || ""} /></label>
        </div>
      )}
      {(kind === "income" || kind === "in_kind") && (
        <label className="check"><input type="checkbox" name="showName" defaultChecked={entry ? entry.show_name : false} /> <span>Name them in the transparency report (leave off to keep them unnamed, like private donors)</span></label>
      )}
      <label className="field"><span>Notes <small>Only admins see these</small></span><textarea name="notes" rows={2} maxLength={LEDGER_LIMITS.notes} defaultValue={entry?.notes || ""} /></label>

      <div className="donation-files-row">
        {saved.length > 0 && (
          <div className="donation-files">
            <div className="donation-files-head"><span className="strong">Saved {label.toLowerCase()}{saved.length > 1 ? "s" : ""}</span></div>
            <ul className="donation-file-list">
              {saved.map((f) => (
                <li key={f.id}>
                  <a href={`${base}/ledger/file/${f.id}`} target="_blank" rel="noopener noreferrer">
                    {f.mime === "application/pdf" ? <span className="donation-file-pdf" aria-hidden="true">PDF</span> : <img src={`${base}/ledger/file/${f.id}`} alt="" loading="lazy" />}
                    <span className="small">{f.name}</span>
                  </a>
                  {confirming === f.id ? (
                    <span className="donation-file-confirm">
                      <button type="button" className="btn small danger" data-confirm="inline-confirm-step" onClick={() => removeFile(f.id)}>Yes, remove</button>
                      <button type="button" className="btn small ghost" data-confirm="not-needed-read-only" onClick={() => setConfirming("")}>Keep</button>
                    </span>
                  ) : <button type="button" className="btn small ghost" data-confirm="opens-inline-confirm" onClick={() => setConfirming(f.id)}>Remove</button>}
                </li>
              ))}
            </ul>
            <p className="small donation-file-note" role="status" aria-live="polite">{message}</p>
          </div>
        )}
        <ProofPicker key={kind} label={saved.length ? `Add to the ${label.toLowerCase()}` : label} hint={hint} required={needsProof(kind) && !saved.length} />
      </div>

      <div className="actions">
        <ConfirmButton className="btn dark" title={entry ? "Save this line?" : `Add this ${LEDGER_KINDS.find(([k]) => k === kind)[1].toLowerCase()}?`} items={[needsProof(kind) ? "It counts in the ledger and the transparency report, with its proof." : kind === "in_kind" ? "It's listed with its value, apart from the cash." : "It counts as cash in.", "Logged under your name.", "Nothing is emailed."]}>{entry ? "Save" : "Add to the ledger"}</ConfirmButton>
        {entry && <ConfirmButton className="btn ghost" formAction={removeLedgerEntry} tone="alert" title="Remove this line?" items={["It leaves the ledger and the transparency report.", "The activity log keeps a record of it."]}>Remove from the ledger</ConfirmButton>}
      </div>
    </form>
  );
}
