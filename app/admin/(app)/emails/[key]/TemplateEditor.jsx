"use client";

import { useMemo, useRef, useState } from "react";
import { renderTemplate, SAMPLE_PERSON, TEMPLATE_LIMITS } from "../../../../lib/emailTemplates.mjs";
import { resetEmailTemplate, saveEmailTemplate, sendTestEmail } from "../../../emailActions";

const PASS = { button: { label: "Open my pass", href: "#" } };

/**
 * Edits one email with a live preview: a built-in one (`templateKey`), or one
 * of HOR's own (`customId`, or a new one of `kind`), which also has a name. Clicking a variable inserts it
 * where the cursor was in the last field used. The preview fills variables
 * with a sample person.
 */
export default function TemplateEditor({ templateKey, customId, kind, name: initialName = "", initial, defaults, custom, variables }) {
  const ref = templateKey || `custom:${kind}`;
  const own = !templateKey;
  const event = ref === "rsvp-confirmed" || ref === "custom:event";
  const [name, setName] = useState(initialName);
  const [fields, setFields] = useState({ subject: initial.subject || "", greeting: initial.greeting || "", heading: initial.heading || "", message: initial.message || "" });
  const [width, setWidth] = useState("phone");
  const last = useRef({ name: "message", el: null });
  const mail = useMemo(() => renderTemplate(ref, fields, SAMPLE_PERSON, event ? PASS : {}), [ref, event, fields]);
  const changed = name !== initialName || JSON.stringify(fields) !== JSON.stringify({ subject: initial.subject || "", greeting: initial.greeting || "", heading: initial.heading || "", message: initial.message || "" });

  const set = (name) => (e) => {
    last.current = { name, el: e.target };
    setFields((f) => ({ ...f, [name]: e.target.value }));
  };
  const track = (name) => (e) => { last.current = { name, el: e.target }; };

  function insert(token) {
    const { name, el } = last.current;
    const value = fields[name] || "";
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    setFields((f) => ({ ...f, [name]: next }));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const field = (name, label, hint, rows = 0) => (
    <label className="field">
      <span>{label} {hint && <small>{hint}</small>}</span>
      {rows ? (
        <textarea name={name} rows={rows} maxLength={TEMPLATE_LIMITS[name]} value={fields[name]} onChange={set(name)} onFocus={track(name)} onClick={track(name)} onKeyUp={track(name)} />
      ) : (
        <input type="text" name={name} maxLength={TEMPLATE_LIMITS[name]} value={fields[name]} onChange={set(name)} onFocus={track(name)} onClick={track(name)} onKeyUp={track(name)} />
      )}
    </label>
  );

  return (
    <div className="grid-2 template-grid">
      <form action={saveEmailTemplate} className="form card">
        {templateKey && <input type="hidden" name="key" value={templateKey} />}
        {customId && <input type="hidden" name="id" value={customId} />}
        {own && !customId && <input type="hidden" name="kind" value={kind} />}
        {own && (
          <label className="field">
            <span>Template name <small>Only admins see this, e.g. “Volunteer accepted” or “Barkdate confirmation”</small></span>
            <input type="text" name="name" maxLength={80} required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        {field("subject", "Subject", "The line people see in their inbox")}
        {field("greeting", "Greeting", "Optional, above the heading, e.g. Hi {{first_name}},")}
        {field("heading", "Heading", "The big serif line")}
        {field("message", "Message", "A blank line starts a new paragraph. **like this** makes text bold.", 14)}
        <div className="template-vars">
          <span className="field-head">Variables <small>Click to insert where your cursor is</small></span>
          <ul>
            {variables.map(([name, help]) => (
              <li key={name}><button type="button" className="tag-badge var-chip" onClick={() => insert(`{{${name}}}`)}>{`{{${name}}}`}</button> <span className="small muted">{help}</span></li>
            ))}
          </ul>
        </div>
        <div className="actions">
          <button className="btn gold" disabled={!changed && custom}>Save</button>
          <button className="btn ghost" formAction={sendTestEmail}>Send a test to me</button>
          {!own && <button type="button" className="linkish" onClick={() => setFields({ ...defaults })}>Start from HOR's original wording</button>}
          {!own && custom && <button className="linkish danger-text" formAction={resetEmailTemplate}>Delete my wording</button>}
          {customId && <button className="linkish danger-text" formAction={resetEmailTemplate} onClick={(e) => { if (!window.confirm(`Delete “${initialName}”?${kind === "event" ? " Events that use it will send the standard confirmation." : ""}`)) e.preventDefault(); }}>Delete this template</button>}
        </div>
        <p className="small muted">{own ? (customId ? "" : "Not saved yet. ") : custom ? "This email uses your saved wording. " : "This email uses HOR's original wording until you save. "}{event ? "The event's name, date and venue, any fee note and the “Open my pass” button are added automatically. " : ""}The logo band, sign-off (“With love and purpose”), footer and the line about why they got the email are added automatically.</p>
      </form>

      <section className="card template-preview">
        <div className="template-preview-head">
          <div>
            <p className="small muted" style={{ margin: 0 }}>Preview, as {SAMPLE_PERSON.name} (dog: {SAMPLE_PERSON.furbaby}{event ? `, at ${SAMPLE_PERSON.event.title}` : ""})</p>
            <p className="template-subject"><strong>{mail.subject}</strong></p>
          </div>
          <div className="segmented" role="group" aria-label="Preview width">
            <button type="button" aria-pressed={width === "phone"} onClick={() => setWidth("phone")}>Phone</button>
            <button type="button" aria-pressed={width === "desktop"} onClick={() => setWidth("desktop")}>Desktop</button>
          </div>
        </div>
        <iframe title="Email preview" className={`template-frame is-${width}`} srcDoc={mail.html} sandbox="" />
      </section>
    </div>
  );
}
