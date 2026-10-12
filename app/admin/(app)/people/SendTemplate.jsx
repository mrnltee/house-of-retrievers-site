"use client";

import { useMemo, useState } from "react";
import { acceptanceEmail } from "../../../lib/emailTemplates.mjs";

/**
 * "Send an email" on a profile: pick one of HOR's Acceptance templates, see it
 * filled in for this person, and send it. Asks once before sending.
 */
export default function SendTemplate({ action, personId, email, ready, templates, person }) {
  const [id, setId] = useState(templates[0]?.id || "");
  const [open, setOpen] = useState(false);
  const template = templates.find((t) => t.id === id);
  const mail = useMemo(() => (template ? acceptanceEmail({ person, custom: template }) : null), [template, person]);

  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <input type="hidden" name="id" value={personId} />
      <label className="field">
        <span>Template <small>Your Acceptance templates, filled in for {person.name.split(" ")[0]}</small></span>
        <select name="templateId" value={id} onChange={(e) => setId(e.target.value)}>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {mail && (
        <>
          <p className="small" style={{ margin: 0 }}>Subject: <strong>{mail.subject}</strong></p>
          <button type="button" className="linkish" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? "Hide preview" : "Preview"}</button>
          {open && <iframe title="Email preview" className="template-frame is-phone" srcDoc={mail.html} sandbox="" />}
        </>
      )}
      {!person.memberNo && /\{\{\s*member_no\s*\}\}/.test(Object.values(template || {}).join(" ")) && (
        <p className="small muted">This template uses {"{{member_no}}"}, but {person.name.split(" ")[0]} has no number yet, so it will be blank.</p>
      )}
      <div className="actions">
        <button
          className="btn ghost"
          disabled={!ready || !template}
          onClick={(e) => { if (!window.confirm(`Send “${template?.name}” to ${email}?`)) e.preventDefault(); }}
        >
          Send to {email}
        </button>
      </div>
      {!ready && <p className="small muted">Switches on once the Resend key is in Vercel.</p>}
    </form>
  );
}
