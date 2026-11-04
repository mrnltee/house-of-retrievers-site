"use client";

import { blankSample } from "../../../../lib/letters/samples.mjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { fillLetter, letterDate, missingBlanks, prepareLetter } from "../../../../lib/letters.mjs";
import { applyEmailFrame, letterCoverEmail } from "../../../../lib/emailTemplates.mjs";
import { designLabel, escapeFills, fillDesign, renderDesign, sendBlanks } from "../../../../lib/emailDesign.mjs";
import { hasSignatureMark, placeSignatureMark } from "../../../../lib/letterSignature.mjs";
import { sendLetters } from "../../../letterActions";
import ConfirmButton from "../../ConfirmButton";
import LetterView from "../LetterView";

/**
 * Pick the letter, tick recipients, fill the blanks (standard details fill in
 * by themselves; last values are offered again), check each recipient's email
 * and attachment, then send.
 */
export default function LetterSend({ letters, letter, blanks, saved, standard = [], from = "", detailsHref = "", editHref = "", signatureCheck = null, recipients, max, ready, pdfAction, back, eventId = "", designs = [], house = null, frame = null }) {
  const isStandard = (label) => standard.includes(label);
  // Every fill-in this page could ask for (the letter's and every design's), so switching design keeps answers.
  const [values, setValues] = useState(() => Object.fromEntries([...blanks, ...designs.flatMap((d) => sendBlanks(letter, d, false))].map((b) => [b.label, saved[b.label] ?? b.suggestion ?? ""])));
  const [designId, setDesignId] = useState("");
  const design = designs.find((d) => d.id === designId) || null;
  const [picked, setPicked] = useState(() => new Set(recipients.filter((r) => r.email).map((r) => r.ref)));
  const [previewRef, setPreviewRef] = useState(recipients.find((r) => r.email)?.ref || recipients[0]?.ref);
  const who = recipients.find((r) => r.ref === previewRef) || recipients[0];
  const date = letterDate();
  const to = { name: who?.name || "", contact: who?.contact || "", address: who?.address || "", salutation: who?.salutation || "", date, values };
  // Same as the PDF: a signature that is on, with an image, gets a place even if the letter has no {signature} line.
  const signed = Boolean(letter.signature?.on && letter.signature?.image);
  const body = signed && !hasSignatureMark(letter.body) ? placeSignatureMark(letter.body) : letter.body;
  const filled = useMemo(() => fillLetter(body, to), [body, who, date, values]); // eslint-disable-line react-hooks/exhaustive-deps
  const prepared = useMemo(() => prepareLetter(letter, { ...to, signed }), [letter, who, date, values, signed]); // eslint-disable-line react-hooks/exhaustive-deps
  // Attach the PDF (a short cover email), or send the letter itself as the email (owner, 2026-11-04).
  // A letter set to email only never has a PDF; a PDF letter can skip it for this send.
  const pdfLetter = letter.attachPdf !== false;
  const [attach, setAttach] = useState(pdfLetter);
  const shownBlanks = useMemo(() => sendBlanks(letter, design, attach), [letter, design, attach]);
  const email = useMemo(() => {
    if (design) {
      const escaped = escapeFills(to);
      const filled = fillDesign(design.doc, design.subject || prepared.subject, (text, { html }) => fillLetter(text, html ? escaped : to, { plain: !html }));
      return renderDesign(filled.doc, { house, subject: filled.subject });
    }
    return applyEmailFrame(letterCoverEmail({ subject: prepared.subject, cover: prepared.cover, filename: prepared.filename, attached: attach }), frame);
  }, [prepared, attach, design, house, who, date, values, frame]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = missingBlanks(shownBlanks, values);
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
        {eventId && <input type="hidden" name="event" value={eventId} />}
        <input type="hidden" name="values" value={JSON.stringify(values)} />
        <input type="hidden" name="attach" value={attach ? "yes" : "no"} />
        <input type="hidden" name="design" value={designId} />
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

        {shownBlanks.some((b) => !isStandard(b.label)) && (
          <fieldset className="field">
            <legend className="field-head">Fill in for this send <small>The same for everyone in it. Your last answers are filled in for you.</small></legend>
            {shownBlanks.filter((b) => !isStandard(b.label)).map((b) => blankInput(b))}
          </fieldset>
        )}
        {shownBlanks.some((b) => isStandard(b.label)) && (
          <details className="field letter-standard">
            <summary className="field-head">Standard details ({shownBlanks.filter((b) => isStandard(b.label)).length}) <small>Filled in by themselves. Open to change them for this send only{detailsHref && <>, or <a href={detailsHref}>edit them for good</a></>}.</small></summary>
            {shownBlanks.filter((b) => isStandard(b.label)).map((b) => blankInput(b))}
          </details>
        )}

        {designs.length > 0 && (
          <label className="field">
            <span>Email design <small>A designed email from Brand email designs, or HOR&apos;s standard email</small></span>
            <select value={designId} onChange={(e) => setDesignId(e.target.value)}>
              <option value="">HOR standard email</option>
              {designs.some((d) => d.forEvent) && <optgroup label="For this event">{designs.filter((d) => d.forEvent).map((d) => <option key={d.id} value={d.id}>{designLabel(d)}</option>)}</optgroup>}
              <optgroup label="Library">{designs.filter((d) => !d.forEvent).map((d) => <option key={d.id} value={d.id}>{designLabel(d)}</option>)}</optgroup>
            </select>
          </label>
        )}
        {pdfLetter ? <label className="check attach-choice">
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
          <span><strong>Attach the letter as a PDF</strong><br /><span className="small muted">{design ? (attach ? "The design goes out with the letter attached as a PDF." : "The design is the whole email; the letter isn't sent.") : attach ? "A short cover email goes out with the letter attached." : "Email only for this send: just the email, no PDF."}</span></span>
        </label> : <p className="small muted" style={{ margin: 0 }}>This letter is set to <strong>email only</strong>: no PDF is attached. Change it in the letter editor.</p>}

        <div className="actions">
          <ConfirmButton
            disabled={!ready || count === 0 || count > max || missing.length > 0}
            title={`Send “${letter.name}” to ${count} recipient${count === 1 ? "" : "s"}?`}
            items={[design ? `Each gets the “${design.name}” email, addressed to them by name${attach ? ", with the letter as a PDF" : " (no PDF attached)"}` : attach ? "Each gets an email with the letter as a PDF, addressed to them by name" : "Each gets the email only, addressed to them by name (no PDF)", "Each send is logged in the activity log", "What you typed is remembered for next time; standard details don't change"]}
            yes="Yes, send letters"
          >
            Send to {count}
          </ConfirmButton>
          {attach && <button type="submit" formAction={pdfAction} formTarget="_blank" formMethod="post" name="download" value="1" className="btn ghost" data-confirm="not-needed-read-only" onClick={(e) => { e.currentTarget.form.elements.namedItem("previewTo").value = previewRef; }}>
            Download PDF for {who?.name}
          </button>}
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
            <div><dt>Subject</dt><dd><strong>{email.subject || prepared.subject}</strong></dd></div>
          </dl>
          {attach && <SignatureStatus check={signatureCheck} editHref={editHref} />}
          {attach ? <p className="mail-attachment" title="The letter, filled in for this recipient">
            <span aria-hidden="true">📄</span> <span><strong>{prepared.filename}</strong><br /><span className="small muted">PDF letter · addressed to {who?.name}</span></span>
          </p> : <p className="small muted">No attachment: email only.</p>}
        </div>
        <LetterView emailOnly={!attach} initial="email" text={filled} email={email} signature={letter.signature?.on ? { ...letter.signature, src: letter.signature.image } : null} action={pdfAction} fields={{ letter: letter.key, previewTo: previewRef, values: JSON.stringify(values) }} />
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
 * Whether the PDF carries the signature: what the server found when it loaded
 * the letter's saved signature (signatureCheck), and what to do if it isn't.
 */
function SignatureStatus({ check, editHref }) {
  if (!check) return null;
  if (check.ok) return <p className="small sig-status is-on" style={{ margin: 0 }}>✓ {check.text}</p>;
  return <p className="small sig-status is-warn" style={{ margin: 0 }}>{check.text}{editHref && <> <a href={editHref}>Open the letter</a> (step 5), then press Save there.</>}</p>;
}
