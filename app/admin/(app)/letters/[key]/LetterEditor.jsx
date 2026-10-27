"use client";

import { useEffect, useMemo, useState } from "react";
import { AUTO_BLANKS, LETTER_HELP, LETTER_LIMITS, blanksOf, fillLetter, letterDate, prepareLetter } from "../../../../lib/letters.mjs";
import { letterCoverEmail } from "../../../../lib/emailTemplates.mjs";
import { resetLetter, saveLetter } from "../../../letterActions";
import ConfirmButton from "../../ConfirmButton";
import LetterView from "../LetterView";

const SAMPLE = "Pawsome Pet Shop";

/** Edits one letter with a live preview. "Preview PDF" posts the unsaved wording to the PDF route. */
export default function LetterEditor({ letter, original, pdfAction }) {
  const [fields, setFields] = useState({ name: letter.name, subject: letter.subject, cover: letter.cover, body: letter.body });
  const changed = JSON.stringify(fields) !== JSON.stringify({ name: letter.name, subject: letter.subject, cover: letter.cover, body: letter.body });
  // Leaving (Back, Previous, Next) with unsaved wording asks first.
  useEffect(() => {
    if (!changed) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed]);
  const blanks = useMemo(() => blanksOf(fields.subject, fields.cover, fields.body), [fields]);
  const preview = useMemo(() => fillLetter(fields.body, { name: SAMPLE, date: letterDate(), values: {} }), [fields.body]);
  const email = useMemo(() => {
    const p = prepareLetter({ ...fields, name: fields.name || letter.name }, { name: SAMPLE });
    return letterCoverEmail({ subject: p.subject, cover: p.cover, filename: p.filename });
  }, [fields, letter.name]);
  const set = (name) => (e) => setFields((f) => ({ ...f, [name]: e.target.value }));

  return (
    <div className="grid-2 template-grid">
      <form action={saveLetter} className="form card">
        <input type="hidden" name="key" value={letter.key} />
        <label className="field">
          <span>Letter name <small>Only admins see this</small></span>
          <input type="text" name="name" maxLength={LETTER_LIMITS.name} required value={fields.name} onChange={set("name")} />
        </label>
        <label className="field">
          <span>Email subject <small>The covering email's subject line</small></span>
          <input type="text" name="subject" maxLength={LETTER_LIMITS.subject} required value={fields.subject} onChange={set("subject")} />
        </label>
        <label className="field">
          <span>Covering email <small>The short email the PDF is attached to. A first “Dear [Company Name],” line becomes the greeting. Write a link as [Partnership Portfolio](https://…).</small></span>
          <textarea name="cover" rows={6} maxLength={LETTER_LIMITS.cover} required value={fields.cover} onChange={set("cover")} />
        </label>
        <label className="field">
          <span>Letter <small>Becomes the PDF</small></span>
          <textarea name="body" rows={24} maxLength={LETTER_LIMITS.body} required value={fields.body} onChange={set("body")} className="letter-source" spellCheck />
        </label>
        <details className="small">
          <summary>How to write a letter</summary>
          <ul>{LETTER_HELP.map((line) => <li key={line}>{line}</li>)}</ul>
        </details>
        <div className="template-vars">
          <span className="field-head">Blanks <small>Filled by themselves, or asked for when sending</small></span>
          <ul>
            {Object.entries(AUTO_BLANKS).map(([label, help]) => <li key={label}><span className="tag-badge var-chip">[{label}]</span> <span className="small muted">{help}</span></li>)}
            {blanks.map((b) => (
              <li key={b.label}><span className="tag-badge">[{b.label}{b.optional ? "?" : ""}]</span> <span className="small muted">{b.optional ? "Optional — its line is left out if empty" : b.suggestion ? "Asked when sending, starting from the suggestion" : "Asked when sending"}</span></li>
            ))}
          </ul>
        </div>
        <div className="actions">
          <ConfirmButton disabled={!changed} title={`Save “${fields.name || "this letter"}”?`} items={["Your wording replaces the current one", "Letters sent from now on use it; letters already sent are unchanged"]} yes="Yes, save letter">Save</ConfirmButton>
          {letter.custom && (
            <ConfirmButton className="linkish danger-text" formAction={resetLetter} title="Go back to the original wording?" items={["Your saved wording is deleted", "The letter goes back to the text converted from HOR's Word file"]} yes="Yes, use the original" tone="danger">
              Back to the original
            </ConfirmButton>
          )}
          {original && changed && <button type="button" className="linkish" onClick={() => setFields({ name: letter.name, subject: letter.subject, cover: letter.cover, body: letter.body })}>Undo my edits</button>}
        </div>
      </form>

      <section className="card template-preview">
        <div className="template-preview-head">
          <div>
            <p className="small muted" style={{ margin: 0 }}>Preview, addressed to {SAMPLE}</p>
            <p className="template-subject"><strong>{fillLetter(fields.subject, { name: SAMPLE })}</strong></p>
          </div>
          <form method="post" action={pdfAction} target="_blank">
            <input type="hidden" name="letter" value={letter.key} />
            <input type="hidden" name="sample" value="1" />
            <input type="hidden" name="subject" value={fields.subject} />
            <input type="hidden" name="cover" value={fields.cover} />
            <input type="hidden" name="body" value={fields.body} />
            <button type="submit" className="btn ghost" data-confirm="not-needed-read-only">Preview PDF</button>
          </form>
        </div>
        <LetterView text={preview} email={email} action={pdfAction} fields={{ letter: letter.key, sample: "1", subject: fields.subject, cover: fields.cover, body: fields.body }} />
      </section>
    </div>
  );
}
