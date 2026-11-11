"use client";

import { useEffect, useState } from "react";

const ticked = () => [...document.querySelectorAll("input[name='to'][form='tracker-send']")].filter((b) => b.checked);

/**
 * Sits above the tracker table: a quiet hint until brands are ticked, then
 * "N selected · Review & send · Clear". The letter used is named here because
 * it only matters when sending (it can be switched in the send window).
 */
export default function SelectionBar({ letterHref, letterName, ownLetterHref }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(ticked().length);
    update();
    document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, []);
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
          <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={clear}>Clear</button>
        </>
      ) : (
        <span className="muted">Select brands to send them a letter.</span>
      )}
      <span className="selection-letter small muted">Letter: <a href={letterHref}>{letterName}</a> · switch it in the send window or <a href={ownLetterHref}>make one for this event</a></span>
    </div>
  );
}
