"use client";

import { blankSample } from "../../../../lib/letters/samples.mjs";
import { useMemo, useState } from "react";
import { fillLetter, letterDate, missingBlanks } from "../../../../lib/letters.mjs";
import { sendLetters } from "../../../letterActions";
import ConfirmButton from "../../ConfirmButton";
import LetterView from "../LetterView";

/**
 * Pick the letter, tick recipients, fill the blanks (last values are offered
 * again), check the letter for any recipient, then send.
 */
export default function LetterSend({ letters, letter, blanks, saved, recipients, max, ready, pdfAction, back }) {
  const [values, setValues] = useState(() => Object.fromEntries(blanks.map((b) => [b.label, saved[b.label] ?? b.suggestion ?? ""])));
  const [picked, setPicked] = useState(() => new Set(recipients.filter((r) => r.email).map((r) => r.ref)));
  const [previewRef, setPreviewRef] = useState(recipients.find((r) => r.email)?.ref || recipients[0]?.ref);
  const who = recipients.find((r) => r.ref === previewRef) || recipients[0];
  const date = letterDate();
  const filled = useMemo(() => fillLetter(letter.body, { name: who?.name || "", date, values }), [letter.body, who, date, values]);
  const subject = fillLetter(letter.subject, { name: who?.name || "", date, values });
  const cover = fillLetter(letter.cover, { name: who?.name || "", date, values }, { plain: true });
  const missing = missingBlanks(blanks, values);
  const count = picked.size;

  function switchLetter(key) {
    const url = new URL(window.location.href);
    url.searchParams.set("letter", key);
    window.location.assign(url.toString());
  }
  const toggle = (ref) => setPicked((s) => {
    const next = new Set(s);
    if (next.has(ref)) next.delete(ref); else next.add(ref);
    return next;
  });

  return (
    <div className="grid-2 template-grid">
      <form action={sendLetters} className="form card">
        <input type="hidden" name="letter" value={letter.key} />
        <input type="hidden" name="back" value={back} />
        <input type="hidden" name="values" value={JSON.stringify(values)} />
        <label className="field">
          <span>Letter</span>
          <select value={letter.key} onChange={(e) => switchLetter(e.target.value)}>
            {letters.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
          </select>
        </label>

        <fieldset className="field">
          <legend className="field-head">Send to <small>{count} of {recipients.length} ticked{count > max ? ` — ${max} at most at a time` : ""}</small></legend>
          <ul className="plain-list letter-recipients">
            {recipients.map((r) => (
              <li key={r.ref}>
                <label className="check">
                  <input type="checkbox" name="to" value={r.ref} checked={picked.has(r.ref)} disabled={!r.email} onChange={() => toggle(r.ref)} />
                  <span><strong>{r.name}</strong> <span className="small muted">· {r.note} · {r.email || "no email on record — add one to send"}</span></span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {blanks.length > 0 && (
          <fieldset className="field">
            <legend className="field-head">Fill in <small>The same for everyone in this send. Last values are filled in for you.</small></legend>
            {blanks.map((b) => {
              const long = b.label.length > 40 || (values[b.label] || "").length > 60;
              const props = { value: values[b.label] || "", maxLength: 600, required: !b.optional, placeholder: blankSample(b.label, letter.key) || undefined, onChange: (e) => setValues((v) => ({ ...v, [b.label]: e.target.value })) };
              return (
                <label key={b.label} className="field">
                  <span>{b.label}{b.optional ? <small> optional</small> : null}</span>
                  {long ? <textarea rows={2} {...props} /> : <input type="text" {...props} />}
                </label>
              );
            })}
          </fieldset>
        )}

        <div className="actions">
          <ConfirmButton
            disabled={!ready || count === 0 || count > max || missing.length > 0}
            title={`Send “${letter.name}” to ${count} recipient${count === 1 ? "" : "s"}?`}
            items={[`Each gets an email with the letter as a PDF, addressed to them by name`, "Each send is logged in the record's history", "What you typed in the blanks is remembered for next time"]}
            yes="Yes, send letters"
          >
            Send to {count}
          </ConfirmButton>
          <button type="submit" formAction={pdfAction} formTarget="_blank" formMethod="post" name="download" value="1" className="btn ghost" data-confirm="not-needed-read-only" onClick={(e) => { e.currentTarget.form.elements.namedItem("previewTo").value = previewRef; }}>
            Download PDF for {who?.name}
          </button>
          <input type="hidden" name="previewTo" />
        </div>
        {!ready && <p className="small muted">Sending switches on once the Resend key is in Vercel.</p>}
        {missing.length > 0 && <p className="small muted">Still to fill: {missing.join(", ")}.</p>}
      </form>

      <section className="card template-preview">
        <div className="template-preview-head">
          <label className="field" style={{ margin: 0 }}>
            <span className="small muted">Preview for</span>
            <select value={previewRef} onChange={(e) => setPreviewRef(e.target.value)}>
              {recipients.map((r) => <option key={r.ref} value={r.ref}>{r.name}</option>)}
            </select>
          </label>
        </div>
        <div className="letter-email">
          <p className="small" style={{ margin: 0 }}>Email subject: <strong>{subject}</strong></p>
          <p className="small letter-cover"><CoverText text={cover} /></p>
          <p className="small muted" style={{ margin: 0 }}>📎 PDF letter attached</p>
        </div>
        <LetterView text={filled} action={pdfAction} fields={{ letter: letter.key, previewTo: previewRef, values: JSON.stringify(values) }} />
      </section>
    </div>
  );
}

/** The covering email as sent: [label](https://…) shows as a link. */
function CoverText({ text }) {
  const parts = String(text || "").split(/(\[[^\]\n]{1,120}\]\(https:\/\/[^\s()<>"]+\))/g);
  return parts.map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
    return link ? <a key={i} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a> : part;
  });
}
