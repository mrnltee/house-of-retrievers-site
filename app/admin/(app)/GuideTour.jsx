"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { finishGuide } from "../guideActions";

/**
 * On-screen guide (owner, 2026-10-27): steps through the person's own menu,
 * pointing at each page. Opens once per sign-in until they tick "Don't show
 * this again"; "Show me around" on Getting started opens it any time.
 */
export default function GuideTour({ steps, autoStart, hidden, sessionKey }) {
  const [step, setStep] = useState(-1);
  const [box, setBox] = useState(null);
  const [hide, setHide] = useState(hidden);

  useEffect(() => {
    const open = () => setStep(0);
    window.addEventListener("hor-guide-start", open);
    let seen = false;
    try { seen = sessionStorage.getItem(sessionKey) === "1"; } catch {}
    if (autoStart && !seen) setStep(0);
    return () => window.removeEventListener("hor-guide-start", open);
  }, [autoStart, sessionKey]);

  const current = step >= 0 ? steps[step] : null;

  useLayoutEffect(() => {
    if (!current?.target) { setBox(null); return; }
    const el = document.querySelector(current.target);
    if (!el) { setBox(null); return; }
    el.scrollIntoView({ block: "nearest" });
    const r = el.getBoundingClientRect();
    setBox(r.width && r.height ? { top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 } : null);
  }, [current]);

  const close = useCallback(() => {
    try { sessionStorage.setItem(sessionKey, "1"); } catch {}
    setStep(-1);
    finishGuide(hide);
  }, [hide, sessionKey]);

  useEffect(() => {
    if (!current) return undefined;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, close]);

  if (!current) return null;
  const last = step === steps.length - 1;
  const cardStyle = box && window.innerWidth > 720
    ? { top: Math.min(Math.max(box.top, 16), window.innerHeight - 260), left: box.left + box.width + 16 }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="guide-tour" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      {box ? <div className="guide-spot" style={box} /> : <div className="guide-dim" />}
      <div className="guide-card" style={cardStyle}>
        <p className="small muted">Step {step + 1} of {steps.length}</p>
        <h2 id="guide-title">{current.title}</h2>
        <p>{current.text}</p>
        {current.level && <p className="small"><span className={`chip ${current.level === "edit" ? "dark" : ""}`}>{current.level === "edit" ? "Edit" : "View"}</span> {current.levelText}</p>}
        <label className="check small" htmlFor="guide-hide">
          <input id="guide-hide" type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />
          <span>Don&apos;t show this again</span>
        </label>
        <div className="actions">
          {step > 0 && <button type="button" className="btn small ghost" onClick={() => setStep(step - 1)}>Back</button>}
          {last
            ? <button type="button" className="btn small gold" onClick={close} autoFocus>Finish</button>
            : <button type="button" className="btn small gold" onClick={() => setStep(step + 1)} autoFocus>Next</button>}
          {!last && <button type="button" className="linkish small" onClick={close}>Skip the guide</button>}
        </div>
      </div>
    </div>
  );
}

/** "Show me around" button for the Getting started page. */
export function StartGuideButton() {
  return <button type="button" className="btn gold" onClick={() => window.dispatchEvent(new Event("hor-guide-start"))}>Show me around</button>;
}
