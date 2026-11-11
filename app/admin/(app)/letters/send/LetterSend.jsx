"use client";

import { blankSample } from "../../../../lib/letters/samples.mjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { fillLetter, letterDate, missingBlanks, prepareLetter, unionBlanks, wordingFor } from "../../../../lib/letters.mjs";
import EditWording from "./EditWording";
import { applyEmailFrame, invitationEmail, letterCoverEmail } from "../../../../lib/emailTemplates.mjs";
import { INVITATION_LIMITS, cardNames, isInvitation } from "../../../../lib/invitationCard.mjs";
import { designLabel, escapeFills, fillDesign, renderDesign, sendBlanks } from "../../../../lib/emailDesign.mjs";
import { hasSignatureMark, placeSignatureMark } from "../../../../lib/letterSignature.mjs";
import { sendLetters } from "../../../letterActions";
import ConfirmButton from "../../ConfirmButton";
import { MAX_COPIES, copiesFor, parseCopies } from "../../../../lib/letterCopies.mjs";
import { SEND_TO_NAME_MAX, readSendTo, withSendTo } from "../../../../lib/letterSendTo.mjs";
import LetterView from "../LetterView";

/**
 * Pick the letter, tick recipients, fill the blanks (standard details fill in
 * by themselves; last values are offered again), check each recipient's email
 * and attachment, then send.
 */
export default function LetterSend({ letters, letter, blanks, saved, standard = [], from = "", detailsHref = "", editHref = "", signatureCheck = null, recipients: listed, max, ready, pdfAction, back, eventId = "", designs = [], house = null, frame = null }) {
  const isStandard = (label) => standard.includes(label);
  // Every fill-in this page could ask for (the letter's and every design's), so switching design keeps answers.
  const [values, setValues] = useState(() => Object.fromEntries([...blanks, ...designs.flatMap((d) => sendBlanks(letter, d, false))].map((b) => [b.label, saved[b.label] ?? b.suggestion ?? ""])));
  const [designId, setDesignId] = useState("");
  // Extra CC / BCC for this send, copied on every recipient's email.
  const [copyCc, setCopyCc] = useState("");
  const [copyBcc, setCopyBcc] = useState("");
  const extraCc = parseCopies(copyCc, "CC");
  const extraBcc = parseCopies(copyBcc, "BCC");
  const copyError = extraCc.error || extraBcc.error || "";
  const design = designs.find((d) => d.id === designId) || null;
  // Another email (and name) for a recipient, for this send only: { ref: { email, contact } }.
  const [sendTo, setSendTo] = useState({});
  const [openOther, setOpenOther] = useState(() => new Set());
  const sendToJson = JSON.stringify(Object.fromEntries(Object.entries(sendTo).filter(([, v]) => v.email?.trim())));
  const sendToCheck = readSendTo(sendToJson, listed.map((r) => r.ref));
  const recipients = useMemo(() => listed.map((r) => withSendTo(r, sendToCheck.byRef[r.ref])), [listed, sendToJson]); // eslint-disable-line react-hooks/exhaustive-deps
  const otherCount = Object.keys(sendToCheck.byRef).length;
  const setOther = (ref, key, value) => setSendTo((all) => ({ ...all, [ref]: { ...all[ref], [key]: value } }));
  const toggleOther = (ref) => setOpenOther((s) => {
    const next = new Set(s);
    if (next.has(ref)) { next.delete(ref); setSendTo((all) => { const rest = { ...all }; delete rest[ref]; return rest; }); } else next.add(ref);
    return next;
  });
  const [picked, setPicked] = useState(() => new Set(listed.filter((r) => r.email).map((r) => r.ref)));
  const [previewRef, setPreviewRef] = useState(listed.find((r) => r.email)?.ref || listed[0]?.ref);
  const who = recipients.find((r) => r.ref === previewRef) || recipients[0];
  const whoCopies = copiesFor({ to: who?.email || "", cc: who?.cc || [] }, extraCc.emails, extraBcc.emails);
  // Wording edited for this send: { all, byRef } (EditWording); the saved letter is unchanged.
  const [edits, setEdits] = useState({ all: null, byRef: {} });
  const active = wordingFor(letter, edits, who?.ref);
  const date = letterDate();
  const to = { name: who?.name || "", contact: who?.contact || "", address: who?.address || "", salutation: who?.salutation || "", date, values };
  // Same as the PDF: a signature that is on, with an image, gets a place even if the letter has no {signature} line.
  const signed = Boolean(letter.signature?.on && letter.signature?.image);
  const body = signed && !hasSignatureMark(active.body) ? placeSignatureMark(active.body) : active.body;
  const filled = useMemo(() => fillLetter(body, to), [body, who, date, values]); // eslint-disable-line react-hooks/exhaustive-deps
  const prepared = useMemo(() => prepareLetter(active, { ...to, signed }), [letter, edits, who, date, values, signed]); // eslint-disable-line react-hooks/exhaustive-deps
  // Attach the PDF (a short cover email), or send the letter itself as the email (owner, 2026-11-04).
  // A letter set to email only never has a PDF; a PDF letter can skip it for this send.
  const pdfLetter = letter.attachPdf !== false;
  // Invitation card (owner, 2026-11-11): each guest's name and organization on the card, editable for this send.
  const invite = isInvitation(letter.invitation);
  const [onCard, setOnCard] = useState({});
  // What's typed stays as typed (spaces and all); it's tidied only when used.
  const namesFor = (r) => cardNames(r, onCard[r.ref] ? { ...cardNames(r), ...onCard[r.ref] } : null);
  const typedCard = (r, key) => onCard[r.ref]?.[key] ?? cardNames(r)[key];
  const cardNamesJson = JSON.stringify(Object.fromEntries(recipients.filter((r) => onCard[r.ref]).map((r) => [r.ref, namesFor(r)])));
  const setCardName = (r, key, value) => setOnCard((all) => ({ ...all, [r.ref]: { ...cardNames(r), ...all[r.ref], [key]: value } }));
  const [cardSrc, setCardSrc] = useState("");
  const whoNames = who ? namesFor(who) : { name: "", org: "" };
  useEffect(() => {
    if (!invite || !who) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const body = new FormData();
      body.set("letter", letter.key);
      body.set("format", "card");
      body.set("previewTo", who.ref);
      body.set("sendTo", sendToJson);
      body.set("cardNames", JSON.stringify({ [who.ref]: whoNames }));
      try {
        const response = await fetch(pdfAction, { method: "POST", body, signal: controller.signal });
        if (!response.ok) throw new Error(await response.text());
        const blob = await response.blob();
        setCardSrc(await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); }));
      } catch (error) {
        if (error.name !== "AbortError") setCardSrc("");
      }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [invite, who?.ref, whoNames.name, whoNames.org, sendToJson]); // eslint-disable-line react-hooks/exhaustive-deps
  const [attach, setAttach] = useState(pdfLetter);
  // Fill-ins for every version being sent (edited wording can add some).
  const shownBlanks = useMemo(() => unionBlanks([letter, ...[...picked].map((ref) => wordingFor(letter, edits, ref))].map((v) => sendBlanks(v, design, attach))), [letter, edits, picked, design, attach]);
  function applyEdit(scope, wording) {
    setEdits((e) => (scope === "all" ? { all: wording, byRef: {} } : { ...e, byRef: { ...e.byRef, [who.ref]: wording } }));
  }
  function resetEdit(scope) {
    setEdits((e) => {
      if (scope === "all") return { ...e, all: null };
      const byRef = { ...e.byRef };
      delete byRef[who.ref];
      return { ...e, byRef };
    });
  }
  const email = useMemo(() => {
    if (design) {
      const escaped = escapeFills(to);
      const filled = fillDesign(design.doc, design.subject || prepared.subject, (text, { html }) => fillLetter(text, html ? escaped : to, { plain: !html }));
      return renderDesign(filled.doc, { house, subject: filled.subject });
    }
    if (invite) return applyEmailFrame(invitationEmail({ subject: prepared.subject, cover: prepared.cover, filename: prepared.filename, name: whoNames.name, cardSrc: cardSrc || "data:," }), frame);
    return applyEmailFrame(letterCoverEmail({ subject: prepared.subject, cover: prepared.cover, filename: prepared.filename, attached: attach }), frame);
  }, [prepared, attach, design, house, who, date, values, frame, invite, cardSrc]); // eslint-disable-line react-hooks/exhaustive-deps
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
        <input type="hidden" name="sendTo" value={sendToJson} />
        <input type="hidden" name="cardNames" value={invite ? cardNamesJson : ""} />
        <input type="hidden" name="edits" value={edits.all || Object.keys(edits.byRef).length ? JSON.stringify(edits) : ""} />
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
                  <span><strong>{r.name}</strong> <span className="small muted">· {r.note} · {r.onRecord !== undefined ? <><strong className="send-to-other">{r.email}</strong> for this send{r.onRecord ? <> (instead of {r.onRecord})</> : null}</> : r.email || "no email on record: add one, or send to another email"}{r.cc?.length ? ` (cc ${r.cc.join(", ")})` : ""}</span></span>
                </label>
                <button type="button" className="linkish small send-to-toggle" aria-expanded={openOther.has(r.ref)} onClick={() => toggleOther(r.ref)}>{openOther.has(r.ref) ? "Use the email on record" : "Send to another email"}</button>
                {invite && (
                  <div className="send-to-other-fields card-names">
                    <label className="field">
                      <span>Name on the card <small>In gold script, e.g. Ms. Malou Perez</small></span>
                      <input type="text" maxLength={INVITATION_LIMITS.name} value={typedCard(r, "name")} onChange={(e) => setCardName(r, "name", e.target.value)} onFocus={() => setPreviewRef(r.ref)} autoComplete="off" />
                    </label>
                    <label className="field">
                      <span>Organization under it <small>Leave empty for none</small></span>
                      <input type="text" maxLength={INVITATION_LIMITS.org} value={typedCard(r, "org")} onChange={(e) => setCardName(r, "org", e.target.value)} onFocus={() => setPreviewRef(r.ref)} autoComplete="off" />
                    </label>
                  </div>
                )}
                {openOther.has(r.ref) && (
                  <div className="send-to-other-fields">
                    <label className="field">
                      <span>Email for this send</span>
                      <input type="email" value={sendTo[r.ref]?.email || ""} onChange={(e) => setOther(r.ref, "email", e.target.value)} placeholder="name@brand.com" autoComplete="off" spellCheck={false} />
                    </label>
                    <label className="field">
                      <span>Their name <small>optional: the letter is addressed to them</small></span>
                      <input type="text" maxLength={SEND_TO_NAME_MAX} value={sendTo[r.ref]?.contact || ""} onChange={(e) => setOther(r.ref, "contact", e.target.value)} placeholder={r.contact || "e.g. Maria Cruz"} autoComplete="off" />
                    </label>
                    <p className="small muted">Only for this send. {r.name}&apos;s saved email and contact person stay as they are.</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset className="field letter-copies">
          <legend className="field-head">Copy others in <small>Optional. Added to every recipient&apos;s email in this send, up to {MAX_COPIES} each; separate addresses with commas.</small></legend>
          <label className="field">
            <span>CC <small>Everyone on the email can see these</small></span>
            <input type="text" name="copyCc" value={copyCc} onChange={(e) => setCopyCc(e.target.value)} placeholder="name@example.com" autoComplete="off" spellCheck={false} aria-invalid={Boolean(extraCc.error)} />
          </label>
          <label className="field">
            <span>BCC <small>Hidden from the recipient, e.g. HOR&apos;s own inbox for the record</small></span>
            <input type="text" name="copyBcc" value={copyBcc} onChange={(e) => setCopyBcc(e.target.value)} placeholder="houseofretrieversph@gmail.com" autoComplete="off" spellCheck={false} aria-invalid={Boolean(extraBcc.error)} />
          </label>
          {copyError ? <p className="small error-text" role="alert">{copyError}</p>
            : count > 1 && (extraCc.emails.length || extraBcc.emails.length) ? <p className="small muted">Each recipient gets their own email, so these addresses get {count} copies.</p> : null}
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

        {designs.length > 0 && !invite && (
          <label className="field">
            <span>Email design <small>A designed email from Brand email designs, or HOR&apos;s standard email</small></span>
            <select value={designId} onChange={(e) => setDesignId(e.target.value)}>
              <option value="">HOR standard email</option>
              {designs.some((d) => d.forEvent) && <optgroup label="For this event">{designs.filter((d) => d.forEvent).map((d) => <option key={d.id} value={d.id}>{designLabel(d)}</option>)}</optgroup>}
              <optgroup label="Library">{designs.filter((d) => !d.forEvent).map((d) => <option key={d.id} value={d.id}>{designLabel(d)}</option>)}</optgroup>
            </select>
          </label>
        )}
        {invite ? <p className="small muted" style={{ margin: 0 }}>An <strong>invitation card</strong>: each guest&apos;s card is in the email, and the full invitation is attached as a PDF.</p> : pdfLetter ? <label className="check attach-choice">
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
          <span><strong>Attach the letter as a PDF</strong><br /><span className="small muted">{design ? (attach ? "The design goes out with the letter attached as a PDF." : "The design is the whole email; the letter isn't sent.") : attach ? "A short cover email goes out with the letter attached." : "Email only for this send: just the email, no PDF."}</span></span>
        </label> : <p className="small muted" style={{ margin: 0 }}>This letter is set to <strong>email only</strong>: no PDF is attached. Change it in the letter editor.</p>}

        <div className="actions">
          <ConfirmButton
            disabled={!ready || count === 0 || count > max || missing.length > 0 || Boolean(copyError) || Boolean(sendToCheck.error)}
            title={`Send “${letter.name}” to ${count} recipient${count === 1 ? "" : "s"}?`}
            items={[invite ? "Each guest gets the invitation email with their own card, and the full invitation as a PDF" : design ? `Each gets the “${design.name}” email, addressed to them by name${attach ? ", with the letter as a PDF" : " (no PDF attached)"}` : attach ? "Each gets an email with the letter as a PDF, addressed to them by name" : "Each gets the email only, addressed to them by name (no PDF)", ...(otherCount ? [`${otherCount} go${otherCount === 1 ? "es" : ""} to another email for this send; ${otherCount === 1 ? "that record keeps" : "those records keep"} their saved email`] : []), ...(extraCc.emails.length ? [`CC on every email: ${extraCc.emails.join(", ")}`] : []), ...(extraBcc.emails.length ? [`BCC (hidden) on every email: ${extraBcc.emails.join(", ")}`] : []), "Each send is logged in the activity log", "What you typed is remembered for next time; standard details don't change"]}
            yes="Yes, send letters"
          >
            Send to {count}
          </ConfirmButton>
          {attach && <button type="submit" formAction={pdfAction} formTarget="_blank" formMethod="post" name="download" value="1" className="btn ghost" data-confirm="not-needed-read-only" onClick={(e) => { e.currentTarget.form.elements.namedItem("previewTo").value = previewRef; }}>
            Download {invite ? "invitation" : "PDF"} for {who?.name}
          </button>}
          <input type="hidden" name="previewTo" />
        </div>
        {!ready && <p className="small muted">Sending switches on once the Resend key is in Vercel.</p>}
        {missing.length > 0 && <p className="small muted">Still to fill: {missing.join(", ")}.</p>}
        {sendToCheck.error && <p className="small error-text" role="alert">{sendToCheck.error}</p>}
      </form>

      <section className="card template-preview">
        <RecipientTabs recipients={recipients} current={previewRef} picked={picked} onPick={setPreviewRef} edited={(ref) => Boolean(edits.byRef[ref] || edits.all)} />
        {who && <EditWording key={`${who.ref}-${JSON.stringify(edits)}`} wording={{ subject: active.subject, cover: active.cover, body: active.body }} showBody={attach && !design && !invite} name={who.name} count={picked.size} mine={Boolean(edits.byRef[who.ref])} forAll={Boolean(edits.all)} onApply={applyEdit} onReset={resetEdit} />}
        <div className="mail-head" aria-label="The email as it arrives">
          <dl>
            <div><dt>From</dt><dd>{from || "HOR's email address"}</dd></div>
            <div><dt>To</dt><dd>{who?.onRecord !== undefined && who?.contact ? who.contact : who?.name}{who?.email ? ` <${who.email}>` : " (no email on record)"}{who?.onRecord !== undefined ? <span className="small muted"> · for this send only</span> : null}</dd></div>
            {whoCopies.cc.length > 0 && <div><dt>Cc</dt><dd>{whoCopies.cc.join(", ")}</dd></div>}
            {whoCopies.bcc.length > 0 && <div><dt>Bcc</dt><dd>{whoCopies.bcc.join(", ")} <span className="small muted">(hidden from them)</span></dd></div>}
            <div><dt>Subject</dt><dd><strong>{email.subject || prepared.subject}</strong></dd></div>
          </dl>
          {attach && !invite && <SignatureStatus check={signatureCheck} editHref={editHref} />}
          {attach ? <p className="mail-attachment" title="The letter, filled in for this recipient">
            <span aria-hidden="true">📄</span> <span><strong>{prepared.filename}</strong><br /><span className="small muted">{invite ? `PDF invitation · card for ${whoNames.name}` : `PDF letter · addressed to ${who?.name}`}</span></span>
          </p> : <p className="small muted">No attachment: email only.</p>}
        </div>
        <LetterView emailOnly={!attach || invite} initial="email" text={filled} email={email} signature={letter.signature?.on ? { ...letter.signature, src: letter.signature.image } : null} action={pdfAction} fields={{ letter: letter.key, previewTo: previewRef, values: JSON.stringify(values), sendTo: sendToJson, cardNames: invite ? JSON.stringify({ [previewRef]: whoNames }) : "", ...(active.edited ? { subject: active.subject, cover: active.cover, body: active.body } : {}) }} />
      </section>
    </div>
  );
}

/**
 * One tab per recipient above the preview (owner, 2026-10-31): click, or use
 * ← → / Home / End, or the ‹ › buttons. Scrolls sideways when there are many.
 * Unticked people stay as tabs, struck through, so they can be checked too.
 */
function RecipientTabs({ recipients, current, picked, onPick, edited = () => false }) {
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
              {r.name}{!r.email ? " ⚠" : ""}{edited(r.ref) ? " ✎" : ""}
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
