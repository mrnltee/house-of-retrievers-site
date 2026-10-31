"use client";

import { blankSample } from "../../../../lib/letters/samples.mjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { fillLetter, letterDate, missingBlanks, prepareLetter } from "../../../../lib/letters.mjs";
import { letterCoverEmail } from "../../../../lib/emailTemplates.mjs";
import { hasSignatureMark } from "../../../../lib/letterSignature.mjs";
import { sendLetters } from "../../../letterActions";
import ConfirmButton from "../../ConfirmButton";
import LetterView from "../LetterView";

/**
 * Pick the letter, tick recipients, fill the blanks (standard details fill in
 * by themselves; last values are offered again), check each recipient's email
 * and attachment, then send.
 */
export default function LetterSend({ letters, letter, blanks, saved, standard = [], from = "", detailsHref = "", editHref = "", recipients, max, ready, pdfAction, back }) {
  const isStandard = (label) => standard.includes(label);
  const [values, setValues] = useState(() => Object.fromEntries(blanks.map((b) => [b.label, saved[b.label] ?? b.suggestion ?? ""])));
  const [picked, setPicked] = useState(() => new Set(recipients.filter((r) => r.email).map((r) => r.ref)));
  const [previewRef, setPreviewRef] = useState(recipients.find((r) => r.email)?.ref || recipients[0]?.ref);
  const who = recipients.find((r) => r.ref === previewRef) || recipients[0];
  const date = letterDate();
  const to = { name: who?.name || "", contact: who?.contact || "", address: who?.address || "", salutation: who?.salutation || "", date, values };
  const filled = useMemo(() => fillLetter(letter.body, to), [letter.body, who, date, values]); // eslint-disable-line react-hooks/exhaustive-deps
  const prepared = useMemo(() => prepareLetter(letter, to), [letter, who, date, values]); // eslint-disable-line react-hooks/exhaustive-deps
  const email = useMemo(() => letterCoverEmail({ subject: prepared.subject, cover: prepared.cover, filename: prepared.filename }), [prepared]);
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

  function blankInput(b) {
    const long = b.label.length > 40 || (values[b.label] || "").length > 60;
    const props = { value: values[b.label] || "", maxLength: 600, required: !b.optional, placeholder: blankSample(b.label, letter.key) || undefined, onChange: (e) => setValues((v) => ({ ...v, [b.label]: e.target.value })) };
    return (
      <label key={b.label} className="field">
        <span>{b.label}{b.optional ? <small> optional</small> : null}</span>
        {long ? <textarea rows={2} {...props} /> : <input type="text" {...props} />}
      </label>
    );
  }

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
                  <span><strong>{r.name}</strong> <span className="small muted">· {r.note} · {r.email || "no email on record: add one to send"}{r.cc?.length ? ` (cc ${r.cc.join(", ")})` : ""}</span></span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {blanks.some((b) => !isStandard(b.label)) && (
          <fieldset className="field">
            <legend className="field-head">Fill in for this send <small>The same for everyone in it. Your last answers are filled in for you.</small></legend>
            {blanks.filter((b) => !isStandard(b.label)).map((b) => blankInput(b))}
          </fieldset>
        )}
        {blanks.some((b) => isStandard(b.label)) && (
          <details className="field letter-standard">
            <summary className="field-head">Standard details ({blanks.filter((b) => isStandard(b.label)).length}) <small>Filled in by themselves. Open to change them for this send only{detailsHref && <>, or <a href={detailsHref}>edit them for good</a></>}.</small></summary>
            {blanks.filter((b) => isStandard(b.label)).map((b) => blankInput(b))}
          </details>
        )}

        <div className="actions">
          <ConfirmButton
            disabled={!ready || count === 0 || count > max || missing.length > 0}
            title={`Send “${letter.name}” to ${count} recipient${count === 1 ? "" : "s"}?`}
            items={["Each gets an email with the letter as a PDF, addressed to them by name", "Each send is logged in the activity log", "What you typed is remembered for next time; standard details don't change"]}
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
        <RecipientTabs recipients={recipients} current={previewRef} picked={picked} onPick={setPreviewRef} />
        <div className="mail-head" aria-label="The email as it arrives">
          <dl>
            <div><dt>From</dt><dd>{from || "HOR's email address"}</dd></div>
            <div><dt>To</dt><dd>{who?.name}{who?.email ? ` <${who.email}>` : " (no email on record)"}</dd></div>
            {who?.cc?.length > 0 && <div><dt>Cc</dt><dd>{who.cc.join(", ")}</dd></div>}
            <div><dt>Subject</dt><dd><strong>{prepared.subject}</strong></dd></div>
          </dl>
          <SignatureStatus letter={letter} editHref={editHref} />
          <p className="mail-attachment" title="The letter, filled in for this recipient">
            <span aria-hidden="true">📄</span> <span><strong>{prepared.filename}</strong><br /><span className="small muted">PDF letter · addressed to {who?.name}</span></span>
          </p>
        </div>
        <LetterView initial="email" text={filled} email={email} signature={letter.signature?.on ? { ...letter.signature, src: letter.signature.image } : null} action={pdfAction} fields={{ letter: letter.key, previewTo: previewRef, values: JSON.stringify(values) }} />
      </section>
    </div>
  );
}

/**
 * One tab per recipient above the preview (owner, 2026-10-31): click, or use
 * ← → / Home / End, or the ‹ › buttons. Scrolls sideways when there are many.
 * Unticked people stay as tabs, struck through, so they can be checked too.
 */
function RecipientTabs({ recipients, current, picked, onPick }) {
  const strip = useRef(null);
  const at = Math.max(0, recipients.findIndex((r) => r.ref === current));
  const go = (i) => onPick(recipients[(i + recipients.length) % recipients.length].ref);
  useEffect(() => {
    strip.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);
  function onKey(e) {
    const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: recipients.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    go(next);
    requestAnimationFrame(() => strip.current?.querySelector('[aria-selected="true"]')?.focus());
  }
  return (
    <div className="recipient-tabs">
      <div className="recipient-tabs-head">
        <span className="small muted">Preview for</span>
        {recipients.length > 1 && (
          <span className="recipient-tabs-step">
            <button type="button" className="btn small ghost" onClick={() => go(at - 1)} aria-label="Previous person" data-confirm="not-needed-read-only">‹</button>
            <span className="small">{at + 1} of {recipients.length}</span>
            <button type="button" className="btn small ghost" onClick={() => go(at + 1)} aria-label="Next person" data-confirm="not-needed-read-only">›</button>
          </span>
        )}
      </div>
      <div ref={strip} className="recipient-tablist" role="tablist" aria-label="Recipients" onKeyDown={onKey}>
        {recipients.map((r) => {
          const on = r.ref === current;
          const out = !picked.has(r.ref);
          return (
            <button
              key={r.ref}
              type="button"
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              className={`recipient-tab${out ? " is-out" : ""}${!r.email ? " no-email" : ""}`}
              title={out ? `${r.name} (not ticked: won't be sent)` : r.email ? `${r.name} <${r.email}>` : `${r.name} (no email on record)`}
              onClick={() => onPick(r.ref)}
              data-confirm="not-needed-read-only"
            >
              {r.name}{!r.email ? " ⚠" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Whether the PDF carries the signature, from the letter as saved (sending
 * never uses unsaved edits), and what to do if it doesn't.
 */
function SignatureStatus({ letter, editHref }) {
  const s = letter.signature || {};
  const fix = editHref ? <> <a href={editHref}>Set it up in the letter</a> (step 5), then press Save there.</> : null;
  if (s.on && s.image && hasSignatureMark(letter.body)) return <p className="small sig-status is-on" style={{ margin: 0 }}>✓ Signature included in the PDF</p>;
  if (s.on && s.image) return <p className="small sig-status is-warn" style={{ margin: 0 }}>Signature is on, but the letter has no place for it, so it won&apos;t show.{fix}</p>;
  if (s.on) return <p className="small sig-status is-warn" style={{ margin: 0 }}>Signature is on but has no image saved, so it won&apos;t show.{fix}</p>;
  return <p className="small muted sig-status" style={{ margin: 0 }}>No signature on this letter.{fix}</p>;
}

