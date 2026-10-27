"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadChat, sendChat } from "../../chatActions";
import { CHAT_MAX } from "../../../lib/admin/chat.mjs";

const time = (iso) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** The team room: new messages every few seconds while the tab is open. */
export default function TeamChat({ preview }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lastId = useRef(0);
  const list = useRef(null);

  const refresh = useCallback(async () => {
    const result = await loadChat(lastId.current).catch(() => null);
    if (!result || result.error || !result.messages.length) return;
    lastId.current = result.messages[result.messages.length - 1].id;
    setMessages((old) => [...old, ...result.messages.filter((m) => !old.some((o) => o.id === m.id))]);
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [messages.length]);

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

  return (
    <section className="card chat">
      <div className="chat-list" ref={list} aria-live="polite">
        {messages.length === 0 && <p className="empty">No messages yet. Say hello to the team!</p>}
        {messages.map((m) => (
          <article key={m.id} className={`chat-msg ${m.mine ? "mine" : ""}`}>
            <p className="chat-meta"><strong>{m.mine ? "You" : m.author}</strong> · {time(m.at)}</p>
            <p className="chat-body">{m.body}</p>
          </article>
        ))}
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
