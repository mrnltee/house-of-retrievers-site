"use client";

import { useEffect, useState } from "react";

const ticked = () => [...document.querySelectorAll("input[name='to'][form='tracker-send']")].filter((b) => b.checked);

/**
 * Sits above the tracker table: a quiet hint until brands are ticked, then
 * "N selected · Review & send · Clear". The letter used is named here because
 * it only matters when sending (it can be switched in the send window).
 */
export default function SelectionBar({ letterHref, letterName, ownLetterHref, hint = "Tick brands to send one letter to several at once.", letterNote = "", messageBase = "" }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(ticked().length);
    update();
    document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, []);
  // "Send a message" (Guest tracker): the send window on Write my own email for whoever is ticked.
  // It goes through a link so the send window opens over the page, like every other send.
  function message() {
    const url = new URL(messageBase, window.location.href);
    ticked().forEach((b) => url.searchParams.append("to", b.value));
    const link = document.createElement("a");
    link.href = url.pathname + url.search;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  function clear() {
    ticked().forEach((b) => { b.checked = false; });
    document.dispatchEvent(new Event("change"));
  }
  return (
    <div className={`selection-bar${count ? " is-active" : ""}`} aria-live="polite">
      {count ? (
        <>
          <strong>{count} selected</strong>
          <button type="submit" form="tracker-send" className="btn dark small" data-confirm="not-needed-read-only">Review &amp; send</button>
          {messageBase && <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={message}>Send a message</button>}
          <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={clear}>Clear</button>
        </>
      ) : (
        <span className="muted">{hint}</span>
      )}
      <span className="selection-letter small muted">{letterNote ? <>{letterNote} · </> : null}Letter: <a href={letterHref}>{letterName}</a> · switch it in the send window or <a href={ownLetterHref}>make one for this event</a></span>
    </div>
  );
}
