"use client";

import { useMemo, useRef, useState } from "react";
import { applyEmailFrame, EVENT_DETAILS_DEFAULT, eventReminder, TEMPLATE_LIMITS } from "../../../../../lib/emailTemplates.mjs";
import { sendEventReminders, sendEventReminderTest } from "../../../../reminderActions";
import ConfirmButton from "../../../ConfirmButton";
import RichTextField from "../../../emails/RichTextField";

const when = (iso) => new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });

/**
 * Edit the reminder wording (starts from the saved email, changes apply to this
 * send only), tick who gets it, preview it as the first person ticked, then send.
 */
export default function ReminderComposer({ eventId, event, recipients, preselected, initial, defaults, usingSaved, mine = [], newHref, variables, frame = null, max, testTo, templateHref }) {
  const startFields = (src) => ({ subject: src.subject || "", greeting: src.greeting || "", heading: src.heading || "", message: src.message || "", details: typeof src.details === "string" ? src.details : EVENT_DETAILS_DEFAULT });
  const [fields, setFields] = useState(() => startFields(initial));
  const richRefs = { message: useRef(null), details: useRef(null) };
  const eligible = recipients.filter((r) => r.eligible);
  const [ticked, setTicked] = useState(() => new Set(preselected ? [preselected] : eligible.map((r) => r.id)));
  const [width, setWidth] = useState("phone");
  const last = useRef({ name: "message", el: null });

  const first = recipients.find((r) => ticked.has(r.id));
  const mail = useMemo(
    () => applyEmailFrame(eventReminder({ name: first?.name || "Juan dela Cruz", event, passUrl: "#", code: "7KQ2MPX4RT", custom: fields }), frame),
    [first, event, fields, frame],
  );
  const changed = JSON.stringify(fields) !== JSON.stringify(startFields(initial));
  const again = recipients.filter((r) => ticked.has(r.id) && r.lastReminded);
  const count = ticked.size;

  const toggle = (id) => setTicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const set = (name) => (e) => { last.current = { name, el: e.target }; setFields((f) => ({ ...f, [name]: e.target.value })); };
  const track = (name) => (e) => { last.current = { name, el: e.target }; };

  function insert(token) {
    const { name, el } = last.current;
    if (richRefs[name]?.current) { richRefs[name].current.insert(token); return; }
    const value = fields[name] || "";
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    setFields((f) => ({ ...f, [name]: value.slice(0, start) + token + value.slice(end) }));
    requestAnimationFrame(() => { if (!el) return; el.focus(); el.setSelectionRange(start + token.length, start + token.length); });
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
    <form className="grid-2 template-grid" action={sendEventReminders}>
      <input type="hidden" name="eventId" value={eventId} />
      <div className="form" style={{ gap: 20 }}>
        <section className="card form">
          <h2 style={{ margin: 0 }}>The email</h2>
          <p className="small muted" style={{ margin: 0 }}>
            {usingSaved ? "Starts from HOR's saved wording. " : "Starts from HOR's original wording. "}
            Changes here apply to this send only. <a href={templateHref}>Edit the standard wording</a> to change it for every event.
          </p>
          <label className="field">
            <span className="field-head">Start from</span>
            <select defaultValue="" onChange={(e) => {
              const m = mine.find((x) => x.id === e.target.value);
              setFields(startFields(m || initial));
            }}>
              <option value="">{usingSaved ? "Standard wording (HOR's saved)" : "Standard wording"}</option>
              {mine.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <small>Your own reminder templates. <a href={newHref}>Write a new one</a></small>
          </label>
          {field("subject", "Subject", "The line people see in their inbox")}
          {field("greeting", "Greeting", "Optional, above the heading, e.g. Hi {{first_name}},")}
          {field("heading", "Heading", "The big serif line")}
          <RichTextField ref={richRefs.details} name="details" label="Event details" hint="The box under the heading. Remove the text to leave it out."
            value={fields.details} onChange={(v) => setFields((f) => ({ ...f, details: v }))} onFocus={() => { last.current = { name: "details", el: null }; }} minHeight={90} />
          <RichTextField ref={richRefs.message} name="message" label="Message / guidelines" hint="Type it as it will look. Select words to make them bold or a link."
            value={fields.message} onChange={(v) => setFields((f) => ({ ...f, message: v }))} onFocus={() => { last.current = { name: "message", el: null }; }} minHeight={260} />
          <div className="template-vars">
            <span className="field-head">Variables <small>Click to insert where your cursor is</small></span>
            <ul>
              {variables.map(([name, help]) => (
                <li key={name}><button type="button" className="tag-badge var-chip" onClick={() => insert(`{{${name}}}`)}>{`{{${name}}}`}</button> <span className="small muted">{help}</span></li>
              ))}
            </ul>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Their check-in QR and the “Open my pass” button are added automatically.</p>
          {changed && <button type="button" className="linkish" onClick={() => setFields(startFields(initial))}>Undo my changes</button>}
          {!changed && <button type="button" className="linkish" onClick={() => setFields(startFields(defaults))}>Start from HOR's original wording</button>}
        </section>

        <section className="card form">
          <div className="actions" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>Who gets it <small className="muted">{count} of {eligible.length} ticked</small></h2>
            <span className="actions">
              <button type="button" className="linkish" onClick={() => setTicked(new Set(eligible.map((r) => r.id)))}>Everyone</button>
              <button type="button" className="linkish" onClick={() => setTicked(new Set(eligible.filter((r) => !r.lastReminded).map((r) => r.id)))}>Not reminded yet</button>
              <button type="button" className="linkish" onClick={() => setTicked(new Set())}>None</button>
            </span>
          </div>
          {recipients.length === 0 && <p className="muted">Nobody has registered for this event yet.</p>}
          <div className="table-wrap">
            <table>
              <thead><tr><th><span className="visually-hidden">Send</span></th><th>Name</th><th>Furbaby</th><th>Last reminder</th></tr></thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.eligible
                        ? <input type="checkbox" name="ids" value={r.id} checked={ticked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Send to ${r.name}`} />
                        : <input type="checkbox" disabled aria-label={`${r.name} can't be emailed`} />}
                    </td>
                    <td><strong>{r.name}</strong><br /><span className="small muted">{r.email}</span></td>
                    <td>{r.furbaby || <span className="muted">—</span>}</td>
                    <td className="small">
                      {!r.eligible ? <span className="chip warn">{r.reason}</span> : r.lastReminded ? <>{when(r.lastReminded)}{r.count > 1 ? ` · ${r.count}×` : ""}</> : <span className="muted">Not yet</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Only people with a confirmed spot get it (on a paid event, once their payment is confirmed), because it carries their pass. Waitlisted and unpaid registrations are shown but can't be ticked.</p>
          <div className="actions">
            <ConfirmButton
              disabled={count === 0 || count > max}
              title={`Email ${count} ${count === 1 ? "person" : "people"}?`}
              items={[
                `${count} ${count === 1 ? "registration gets" : "registrations each get"} this email with their own pass`,
                `Subject: ${fields.subject || "—"}`,
                ...(again.length ? [`${again.length} of them already had a reminder before`] : []),
                "It can't be unsent",
              ]}
              note={again.length ? `Already reminded: ${again.slice(0, 5).map((r) => r.name).join(", ")}${again.length > 5 ? ` and ${again.length - 5} more` : ""}.` : ""}
              yes="Yes, send the emails"
            >{count === 1 ? "Send to 1 person" : `Send to ${count} people`}</ConfirmButton>
            <ConfirmButton
              className="btn ghost"
              formAction={sendEventReminderTest}
              title="Send a test?"
              items={[`The email is sent to ${testTo}, with a sample name`, "No participant is emailed"]}
              yes="Yes, send the test"
              tone="ghost"
            >Send a test to {testTo}</ConfirmButton>
          </div>
          {count > max && <p className="small danger-text">Send up to {max} at a time: untick some, then send the rest after.</p>}
        </section>
      </div>

      <section className="card template-preview">
        <div className="template-preview-head">
          <div>
            <p className="small muted" style={{ margin: 0 }}>Preview, as {first ? first.name : "a sample guest"}</p>
            <p className="template-subject"><strong>{mail.subject}</strong></p>
          </div>
          <div className="segmented" role="group" aria-label="Preview width">
            <button type="button" aria-pressed={width === "phone"} onClick={() => setWidth("phone")}>Phone</button>
            <button type="button" aria-pressed={width === "desktop"} onClick={() => setWidth("desktop")}>Desktop</button>
          </div>
        </div>
        <iframe title="Email preview" className={`template-frame is-${width}`} srcDoc={mail.html} sandbox="" />
      </section>
    </form>
  );
}
