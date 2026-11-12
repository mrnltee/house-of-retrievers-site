"use client";

import { useEffect, useRef, useState } from "react";
import { MEDIA_MESSAGE_TO, MESSAGE_LIMITS, MESSAGE_TYPES, messageType } from "../lib/mediaMessage.mjs";
import { HONEYPOT_FIELD } from "../lib/spamGuard.mjs";

/**
 * The media hub's message box. Any link marked `data-message="<type>"` opens it
 * with that type chosen; the message goes to HOR's Gmail through /api/media-message,
 * with replies straight to the sender. The links keep their mailto, so without
 * JavaScript (or with Ctrl/⌘-click) they still open the visitor's mail app.
 */
export default function MessageForm() {
  const dialog = useRef(null);
  const form = useRef(null);
  const openedAt = useRef(0);
  const [type, setType] = useState("story");
  const [state, setState] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");

  useEffect(() => {
    const onClick = (e) => {
      const link = e.target.closest?.("a[data-message]");
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      setType(messageType(link.dataset.message).key);
      setState("idle");
      setError("");
      form.current?.reset();
      openedAt.current = Date.now();
      dialog.current?.showModal();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function submit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setState("sending");
    setError("");
    try {
      const response = await fetch("/api/media-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type, elapsedMs: Date.now() - openedAt.current }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) throw new Error(body.error || `We couldn't send that just now. Please email us at ${MEDIA_MESSAGE_TO}.`);
      setState("sent");
    } catch (err) {
      setError(err.message);
      setState("idle");
    }
  }

  const close = () => dialog.current?.close();

  return (
    <dialog ref={dialog} className="media-message" aria-labelledby="media-message-title" onClick={(e) => { if (e.target === dialog.current) close(); }}>
      <div className="media-message-box">
        <button type="button" className="media-message-close" onClick={close} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
        {state === "sent" ? (
          <div className="media-message-done" role="status">
            <h2 id="media-message-title">Thank you. Your message is on its way.</h2>
            <p>It went to {MEDIA_MESSAGE_TO}. We'll reply to the email you gave us, usually within a few days.</p>
            <button type="button" className="media-button media-button-dark" onClick={close}>Close</button>
          </div>
        ) : (
          <form ref={form} onSubmit={submit} noValidate={false}>
            <h2 id="media-message-title">Send us a message</h2>
            <p className="media-message-intro">It goes straight to the House of Retrievers team at {MEDIA_MESSAGE_TO}.</p>
            <fieldset className="media-message-types">
              <legend>What is it about?</legend>
              <div>
                {MESSAGE_TYPES.map((t) => (
                  <label key={t.key} className={t.key === type ? "is-on" : ""}>
                    <input type="radio" name="typeChoice" value={t.key} checked={t.key === type} onChange={() => setType(t.key)} />
                    {t.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="media-message-row">
              <label>Your name<input name="name" required maxLength={MESSAGE_LIMITS.name} autoComplete="name" /></label>
              <label>Email<input name="email" type="email" required maxLength={MESSAGE_LIMITS.email} autoComplete="email" /></label>
            </div>
            <div className="media-message-row">
              <label>Organization or outlet <span>(optional)</span><input name="organization" maxLength={MESSAGE_LIMITS.organization} autoComplete="organization" /></label>
              <label>Subject <span>(optional)</span><input name="subject" maxLength={MESSAGE_LIMITS.subject} /></label>
            </div>
            <label>Message<textarea name="message" required minLength={10} maxLength={MESSAGE_LIMITS.message} rows={6} placeholder={type === "story" ? "Tell us the story or angle you have in mind, and any deadline." : ""} /></label>
            <label className="media-message-trap" aria-hidden="true">Website<input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" /></label>
            {error ? <p className="media-message-error" role="alert">{error}</p> : null}
            <div className="media-message-actions">
              <button type="submit" className="media-button media-button-dark" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</button>
              <button type="button" className="media-message-cancel" onClick={close}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
