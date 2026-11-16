"use client";

import { useEffect, useRef, useState } from "react";
import { LETTER_LIMITS, hasOwnEmailPlaceholder } from "../../../../lib/letters.mjs";
import Icon from "../../../../components/Icon";

/**
 * "Edit wording" on the send page (owner, 2026-11-06): change the subject, email and
 * letter for this send, then choose who gets it: only the brand being previewed, or
 * every brand in this send. The saved letter is unchanged; [fill-ins] still work.
 * `own` (Write my own email): the admin replaces a placeholder, and `autoOpen`
 * opens this straight away (then `onOpened` clears it, so a remount doesn't reopen it).
 */
export default function EditWording({ wording, showBody, name, count, mine, forAll, own = false, autoOpen = false, onOpened = () => {}, onApply, onReset }) {
  const dialog = useRef(null);
  const [draft, setDraft] = useState(wording);
  const [step, setStep] = useState("edit");
  const open = () => { setDraft(wording); setStep("edit"); dialog.current?.showModal(); };
  const close = () => dialog.current?.close();
  useEffect(() => {
    if (!autoOpen) return;
    open();
    onOpened();
  }, [autoOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const placeholder = own && hasOwnEmailPlaceholder(draft);
  const changed = draft.subject !== wording.subject || draft.cover !== wording.cover || (showBody && draft.body !== wording.body);
  const apply = (scope) => { onApply(scope, showBody ? draft : { subject: draft.subject, cover: draft.cover }); close(); };
  return (
    <>
      <div className="edit-wording-row">
        <button type="button" className={`btn small ${own && hasOwnEmailPlaceholder(wording) ? "dark" : "ghost"}`} data-confirm="not-needed-read-only" onClick={open}><Icon name="edit" /> {own ? "Write your email" : "Edit wording for this send"}</button>
        {mine && <span className="small"><strong>Edited for {name}</strong> · <button type="button" className="linkish" data-confirm="not-needed-read-only" onClick={() => onReset("one")}>undo</button></span>}
        {!mine && forAll && <span className="small"><strong>Edited for all brands in this send</strong> · <button type="button" className="linkish" data-confirm="not-needed-read-only" onClick={() => onReset("all")}>undo</button></span>}
      </div>
      <dialog ref={dialog} className="confirm-dialog edit-wording-dialog" aria-labelledby="edit-wording-title">
        <div className="confirm-body">
          {step === "edit" ? (
            <>
              <h2 id="edit-wording-title">{own ? "Write your email" : "Edit wording for this send"}</h2>
              <p className="small muted">{own ? <>Replace the placeholder subject and message with your own. [Salutation] becomes each recipient&apos;s name; HOR&apos;s sign-off and footer are added below your message. Nothing is saved as a letter.</> : <>Showing the wording for {name}. Add a line or correct words; [fill-ins] like [Salutation] still fill in. The saved letter stays as it is.</>}</p>
              <label className="field"><span>Email subject</span><input type="text" value={draft.subject} maxLength={LETTER_LIMITS.subject} onChange={set("subject")} /></label>
              <label className="field"><span>{own ? "Message" : "Email text"}</span><textarea rows={own ? 12 : 8} value={draft.cover} maxLength={LETTER_LIMITS.cover} onChange={set("cover")} /></label>
              {showBody && <label className="field"><span>Letter text (the PDF)</span><textarea rows={14} className="letter-source" value={draft.body} maxLength={LETTER_LIMITS.body} onChange={set("body")} /></label>}
              <div className="actions">
                <button type="button" className="btn dark" data-confirm="not-needed-read-only" disabled={!changed || placeholder || !draft.subject.trim() || !draft.cover.trim()} onClick={() => (count > 1 ? setStep("who") : apply("one"))}>Use this wording</button>
                <button type="button" className="btn ghost" data-confirm="not-needed-read-only" onClick={close}>Cancel</button>
              </div>
              {placeholder && <p className="small muted" style={{ margin: 0 }}>Replace “Write your subject here” and “Write your message here.” to continue.</p>}
            </>
          ) : (
            <>
              <h2 id="edit-wording-title">Use the same wording for the other brands?</h2>
              <p className="small muted">{count} brands are ticked in this send.</p>
              <div className="actions" style={{ flexWrap: "wrap" }}>
                <button type="button" className="btn dark" data-confirm="not-needed-read-only" onClick={() => apply("all")}>Yes, all {count} brands</button>
                <button type="button" className="btn ghost" data-confirm="not-needed-read-only" onClick={() => apply("one")}>No, only {name}</button>
                <button type="button" className="linkish" data-confirm="not-needed-read-only" onClick={() => setStep("edit")}>Back to editing</button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
