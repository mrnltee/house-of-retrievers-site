"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FormatBar, { boldKey } from "./FormatBar";
import { AUTO_BLANKS, LETTER_HELP, LETTER_LIMITS, blanksOf, fillLetter, letterDate, prepareLetter } from "../../../../lib/letters.mjs";
import { letterCoverEmail } from "../../../../lib/emailTemplates.mjs";
import { blankSample } from "../../../../lib/letters/samples.mjs";
import { resetLetter, saveLetter } from "../../../letterActions";
import ConfirmButton from "../../ConfirmButton";
import LetterView from "../LetterView";

const SAMPLE = "Pawsome Pet Shop";
// The sample recipient for the preview: fills the address block like a real record would.
const TO = { name: SAMPLE, contact: "Jessie Mae Gabriel", address: "123 Katipunan Ave.\nQuezon City 1108", salutation: "Ms. Jessie" };

/** Edits one letter with a live preview. "Preview PDF" posts the unsaved wording to the PDF route. */
export default function LetterEditor({ letter, original, pdfAction, standard = {}, detailsHref = "" }) {
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
  // The automatic blanks this letter uses, e.g. [Company Name].
  const autos = useMemo(() => Object.keys(AUTO_BLANKS).filter((label) => [fields.subject, fields.cover, fields.body].some((t) => t.includes(`[${label}]`) || t.includes(`[${label}?]`))), [fields]);
  const fromDetails = blanks.filter((b) => standard[b.label] !== undefined);
  const asked = blanks.filter((b) => standard[b.label] === undefined);
  const preview = useMemo(() => fillLetter(fields.body, { ...TO, date: letterDate(), values: standard }), [fields.body, standard]);
  const email = useMemo(() => {
    const p = prepareLetter({ ...fields, name: fields.name || letter.name }, { ...TO, values: standard });
    return letterCoverEmail({ subject: p.subject, cover: p.cover, filename: p.filename });
  }, [fields, letter.name, standard]);
  const set = (name) => (e) => setFields((f) => ({ ...f, [name]: e.target.value }));
  const put = (name) => (text) => setFields((f) => ({ ...f, [name]: text }));
  const coverRef = useRef(null);
  const bodyRef = useRef(null);

  return (
    <div className="grid-2 template-grid">
      <form action={saveLetter} className="form card">
        <input type="hidden" name="key" value={letter.key} />
        <h2 className="letter-step"><span>1</span> Name and subject</h2>
        <label className="field">
          <span>Letter name <small>Only admins see this, in lists and menus</small></span>
          <input type="text" name="name" maxLength={LETTER_LIMITS.name} required value={fields.name} onChange={set("name")} />
        </label>
        <label className="field">
          <span>Email subject <small>What recipients see in their inbox. Don&apos;t add “Email Subject” or similar.</small></span>
          <input type="text" name="subject" maxLength={LETTER_LIMITS.subject} required value={fields.subject} onChange={set("subject")} />
        </label>
        <h2 className="letter-step"><span>2</span> Covering email</h2>
        <div className="field">
          <label htmlFor="letter-cover" className="field-head">Email text <small>The short message the PDF is attached to. Start with “Dear [Salutation],”, keep it to a few lines; the details go in the letter.</small></label>
          <FormatBar target={coverRef} keys={["greeting", "|", "link", "blank"]} value={fields.cover} onChange={put("cover")} label="Covering email formatting">
            <textarea id="letter-cover" ref={coverRef} name="cover" rows={6} maxLength={LETTER_LIMITS.cover} required value={fields.cover} onChange={set("cover")} />
          </FormatBar>
        </div>
        <h2 className="letter-step"><span>3</span> The letter (PDF attachment)</h2>
        <div className="field">
          <label htmlFor="letter-body" className="field-head">Letter text <small>Becomes the PDF, with HOR&apos;s letterhead. Select text, then use a button to format it.</small></label>
          <FormatBar target={bodyRef} keys={["bold", "h1", "h2", "|", "center", "bullet", "table", "page", "|", "address", "greeting", "blank"]} value={fields.body} onChange={put("body")} label="Letter formatting">
            <textarea id="letter-body" ref={bodyRef} name="body" rows={24} maxLength={LETTER_LIMITS.body} required value={fields.body} onChange={set("body")} onKeyDown={boldKey} className="letter-source" spellCheck />
          </FormatBar>
        </div>
        <details className="small">
          <summary>How to write a letter</summary>
          <ul>{LETTER_HELP.map((line) => <li key={line}>{line}</li>)}</ul>
        </details>
        <h2 className="letter-step"><span>4</span> Blanks in this letter</h2>
        <p className="small muted" style={{ margin: 0 }}>Words in [square brackets] are filled in for each recipient. A ? (like [Address?]) makes it optional: its line is left out when there&apos;s nothing to put.</p>
        <div className="template-vars letter-blanks">
          <span className="field-head">From each recipient&apos;s record <small>Nothing to do</small></span>
          {autos.length ? (
            <ul>{autos.map((label) => <li key={label}><span className="tag-badge var-chip">[{label}]</span> <span className="small muted">{AUTO_BLANKS[label]}</span></li>)}</ul>
          ) : <p className="small muted">None yet. Use “Address block” and “Dear name” to address each letter personally.</p>}
          <span className="field-head">From standard details <small>Filled in by themselves{detailsHref && <> · <a href={detailsHref}>change them</a></>}</small></span>
          {fromDetails.length ? (
            <ul>{fromDetails.map((b) => <li key={b.label}><span className="tag-badge var-chip">[{b.label}]</span> <span className="small">{standard[b.label]}</span></li>)}</ul>
          ) : <p className="small muted">None. In <a href={detailsHref}>Standard details</a>, tick “Don&apos;t ask” for answers that are always the same.</p>}
          <span className="field-head">Typed when sending <small>Asked once per send, the same for everyone in it</small></span>
          {asked.length ? (
            <ul>{asked.map((b) => <li key={b.label}><span className="tag-badge">[{b.label}{b.optional ? "?" : ""}]</span> <span className="small muted">{b.optional ? "optional" : "required"}{blankSample(b.label, letter.key) ? <> · e.g. <em>{blankSample(b.label, letter.key).replace(/^e\.g\. /, "")}</em></> : null}</span></li>)}</ul>
          ) : <p className="small muted">Nothing. This letter sends without typing anything.</p>}
        </div>
        <div className="actions">
          <ConfirmButton disabled={!changed} title={`Save “${fields.name || "this letter"}”?`} items={["Your wording replaces the current one", "Letters sent from now on use it; letters already sent are unchanged"]} yes="Yes, save letter">Save</ConfirmButton>
          {letter.custom && letter.starter && (
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
            <p className="template-subject"><strong>{fillLetter(fields.subject, { ...TO, values: standard })}</strong></p>
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
