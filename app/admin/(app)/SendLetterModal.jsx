"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openLetterSend } from "../letterActions";
import LetterSend from "./letters/send/LetterSend";
import { SendIntro } from "./letters/send/SendIntro";

/**
 * The send window (owner, 2026-11-12). Every "send a letter" link or form in
 * the admin points at /letters/send; this catches those clicks and submits and
 * opens the same send form in a window over the page, instead of leaving it.
 * After sending you land back on that page with the result. Ctrl/⌘-click, a
 * new tab, or opening the link directly still gives the full page.
 */
export default function SendLetterModal({ base = "" }) {
  const dialog = useRef(null);
  const [state, setState] = useState(null); // { query, loading, data, error }
  const sendPath = `${base}/letters/send`;

  const open = useCallback(async (query) => {
    setState({ query, loading: true });
    try {
      const data = await openLetterSend(query);
      setState(data?.ok ? { query, data } : { query, error: data?.error || "The send window couldn't open." });
    } catch {
      setState({ query, error: "The send window couldn't open. Check your connection and try again." });
    }
  }, []);

  useEffect(() => {
    if (window.location.pathname === sendPath) return undefined; // The full page is already here.
    const isSend = (url) => url.origin === window.location.origin && url.pathname === sendPath;
    function onClick(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href, window.location.href);
      if (!isSend(url)) return;
      event.preventDefault();
      open(url.search);
    }
    function onSubmit(event) {
      const form = event.target;
      if (event.defaultPrevented || !(form instanceof HTMLFormElement) || (form.method || "get").toLowerCase() !== "get") return;
      const url = new URL(form.action, window.location.href);
      if (!isSend(url)) return;
      event.preventDefault();
      const query = new URLSearchParams();
      for (const [key, value] of new FormData(form, event.submitter || undefined)) if (typeof value === "string") query.append(key, value);
      open(`?${query.toString()}`);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("submit", onSubmit); };
  }, [open, sendPath]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (state && !d.open) d.showModal();
    if (!state && d.open) d.close();
    document.documentElement.classList.toggle("send-modal-open", Boolean(state));
  }, [state]);

  const close = () => setState(null);
  const switchLetter = (key) => {
    const query = new URLSearchParams(String(state?.query || "").replace(/^\?/, ""));
    query.set("letter", key);
    open(`?${query.toString()}`);
  };
  // Where the send returns to: this page, as the admin sees it (without a flash message from before).
  const here = typeof window === "undefined" ? "" : `${window.location.pathname.slice(base.length) || "/"}${window.location.search}`;
  const props = state?.data?.props;

  return (
    <dialog ref={dialog} className="send-modal" aria-labelledby="send-modal-title" onCancel={(e) => { e.preventDefault(); close(); }} onClose={() => state && close()}>
      <div className="send-modal-head">
        <h2 id="send-modal-title">Send a letter</h2>
        {state?.query && <a className="small" href={`${sendPath}${String(state.query).startsWith("?") ? state.query : `?${state.query}`}`} target="_blank" rel="noreferrer">Open as a page ↗</a>}
        <button type="button" className="btn ghost small" onClick={close} aria-label="Close the send window" data-confirm="not-needed-read-only">✕ Close</button>
      </div>
      <div className="send-modal-body">
        {state?.loading && <p className="muted" role="status">Loading the letter and recipients…</p>}
        {state?.error && <p className="card" role="alert">{state.error}</p>}
        {props && (
          <>
            <SendIntro data={state.data} base={base} />
            {props.recipients.length === 0
              ? <p className="card muted">No one to send to: nobody here can get this letter (no confirmed spot, or no email).</p>
              : <LetterSend key={`${props.letter.key}-${state.query}`} {...props} returnTo={here} onSwitchLetter={switchLetter} />}
          </>
        )}
      </div>
    </dialog>
  );
}
