"use client";

import { useMemo, useRef, useState } from "react";
import { renderTemplate, TEMPLATE_LIMITS } from "../../../../lib/emailTemplates.mjs";
import { resetEmailTemplate, saveEmailTemplate, sendTestEmail } from "../../../emailActions";

const SAMPLE = { name: "Juan dela Cruz", furbaby: "Mochi", memberNo: "HOR-26-0001" };

/**
 * Edits one welcome email with a live preview. Clicking a variable inserts it
 * where the cursor was in the last field used. The preview fills variables
 * with a sample person.
 */
export default function TemplateEditor({ templateKey, initial, defaults, custom, variables }) {
  const [fields, setFields] = useState({ subject: initial.subject || "", greeting: initial.greeting || "", heading: initial.heading || "", message: initial.message || "" });
  const [width, setWidth] = useState("phone");
  const last = useRef({ name: "message", el: null });
  const mail = useMemo(() => renderTemplate(templateKey, fields, SAMPLE), [templateKey, fields]);
  const changed = JSON.stringify(fields) !== JSON.stringify({ subject: initial.subject || "", greeting: initial.greeting || "", heading: initial.heading || "", message: initial.message || "" });

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
        <input type="hidden" name="key" value={templateKey} />
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
          <button type="button" className="linkish" onClick={() => setFields({ ...defaults })}>Start from HOR's original wording</button>
          {custom && <button className="linkish danger-text" formAction={resetEmailTemplate}>Delete my wording</button>}
        </div>
        <p className="small muted">{custom ? "This email uses your saved wording." : "This email uses HOR's original wording until you save."} The logo band, sign-off (“With love and purpose”), footer and the line about why they got the email are added automatically.</p>
      </form>

      <section className="card template-preview">
        <div className="template-preview-head">
          <div>
            <p className="small muted" style={{ margin: 0 }}>Preview, as Juan dela Cruz (dog: Mochi)</p>
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
