"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteChat, editChat, loadChat, sendChat } from "../../chatActions";
import { CHAT_MAX } from "../../../lib/admin/chat.mjs";

const time = (iso) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** One message. Your own can be edited or deleted; Owners see history and deleted text. */
export function ChatMessage({ m, onEdit, onDelete, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body || "");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const result = await onEdit(m.id, draft);
    if (result?.error) { setError(result.error); return; }
    setEditing(false);
    setError("");
  }

  return (
    <article className={`chat-msg ${m.mine ? "mine" : ""} ${m.deleted ? "deleted" : ""}`}>
      <p className="chat-meta">
        <strong>{m.mine ? "You" : m.author}</strong> · {time(m.at)}
        {m.edited && !m.deleted && <> · edited</>}
        {m.deleted && <> · deleted{m.body != null ? " (only Owners see this)" : ""}</>}
      </p>
      {editing ? (
        <div className="chat-edit">
          <textarea rows={2} maxLength={CHAT_MAX} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit message" autoFocus />
          <div className="actions">
            <button type="button" className="btn small gold" onClick={save}>Save</button>
            <button type="button" className="btn small ghost" onClick={() => { setEditing(false); setDraft(m.body || ""); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <p className="chat-body">{m.body == null ? <em>Message deleted</em> : m.body}</p>
      )}
      {m.history?.length > 0 && (
        <details className="chat-history">
          <summary>Edit history ({m.history.length}) · Owners only</summary>
          <ol>
            {m.history.map((v, i) => <li key={i}><span className="chat-meta">replaced {time(v.at)}</span><br />{v.body}</li>)}
          </ol>
        </details>
      )}
      {m.mine && !m.deleted && !editing && !readOnly && (
        <div className="chat-tools">
          {asking ? (
            <>
              <span>Delete this message?</span>
              <button type="button" className="linkish" onClick={async () => { const r = await onDelete(m.id); if (r?.error) setError(r.error); setAsking(false); }}>Yes, delete</button>
              <button type="button" className="linkish" onClick={() => setAsking(false)}>No</button>
            </>
          ) : (
            <>
              <button type="button" className="linkish" onClick={() => { setDraft(m.body || ""); setEditing(true); }}>Edit</button>
              <button type="button" className="linkish" onClick={() => setAsking(true)}>Delete</button>
            </>
          )}
        </div>
      )}
      {error && <p className="small" role="alert">{error}</p>}
    </article>
  );
}

/** The team room: refreshed every few seconds while the tab is open. */
export default function TeamChat({ preview }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef(null);
  const lastId = useRef(0);

  const refresh = useCallback(async () => {
    const result = await loadChat().catch(() => null);
    if (!result || result.error) return;
    setMessages(result.messages);
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const newest = messages.length ? messages[messages.length - 1].id : 0;
    if (newest > lastId.current) list.current?.scrollTo({ top: list.current.scrollHeight });
    lastId.current = newest;
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setError("");
    const result = await sendChat(text).catch(() => ({ error: "Didn't send. Try again." }));
    setBusy(false);
    if (result.error) { setError(result.error); return; }
    setText("");
    refresh();
  }

  const edit = async (id, body) => { const r = await editChat(id, body).catch(() => ({ error: "Didn't save. Try again." })); refresh(); return r; };
  const remove = async (id) => { const r = await deleteChat(id).catch(() => ({ error: "Didn't delete. Try again." })); refresh(); return r; };

  return (
    <section className="card chat">
      <div className="chat-list" ref={list} aria-live="polite">
        {messages.length === 0 && <p className="empty">No messages yet. Say hello to the team!</p>}
        {messages.map((m) => <ChatMessage key={`${m.id}-${m.edited}-${m.deleted}`} m={m} onEdit={edit} onDelete={remove} readOnly={preview} />)}
      </div>
      <form className="chat-form" onSubmit={send}>
        <label className="visually-hidden" htmlFor="chat-text">Message</label>
        <textarea
          id="chat-text"
          rows={2}
          maxLength={CHAT_MAX}
          value={text}
          disabled={preview}
          placeholder={preview ? "Sending is off while you preview." : "Write to the team… (Enter sends, Shift+Enter for a new line)"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(e); }}
        />
        <button type="submit" className="btn gold" disabled={busy || preview || !text.trim()} data-confirm="none: a chat message to the team room">{busy ? "Sending…" : "Send"}</button>
      </form>
      {error && <p className="banner alert small" role="alert" style={{ margin: 0 }}>{error}</p>}
    </section>
  );
}
