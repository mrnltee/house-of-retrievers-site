"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BRAND_GUIDES, GUIDES, stepDuration } from "../../lib/admin/howToGuides.mjs";
import HowToScene from "./HowToScenes";

/** Plays stop after this many loops, so nothing keeps moving unattended (WCAG 2.2.2). */
const MAX_LOOPS = 3;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * "▶ How it works" (owner, 2026-11-15): a button that opens an animated guide
 * in a dialog. A pointer moves over a simplified screen and presses what you'd
 * press, step by step, with the caption beside it. Play / Pause, ‹ › and the
 * step list move through it; it starts on `guide` and lists `guides` to switch
 * between. With reduced motion it doesn't play by itself and nothing glides.
 */
export default function HowTo({ guide = BRAND_GUIDES[0], guides = BRAND_GUIDES, label = "How it works", className = "btn ghost small" }) {
  const dialog = useRef(null);
  const stage = useRef(null);
  const [key, setKey] = useState(guide);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loops, setLoops] = useState(0);
  const [pointer, setPointer] = useState({ x: 40, y: 40 });
  const [ring, setRing] = useState(null); // the highlight around the step's target
  const [pressed, setPressed] = useState(false);
  const [typedLen, setTypedLen] = useState(0);
  // Bumped on open and on resize, so the pointer is measured once the dialog is really on screen.
  const [layout, setLayout] = useState(0);
  const current = GUIDES[key] || GUIDES[BRAND_GUIDES[0]];
  const step = current.steps[at];

  const open = () => {
    setKey(guide);
    setAt(0);
    setLoops(0);
    setPlaying(!reducedMotion());
    dialog.current?.showModal();
    setLayout((n) => n + 1);
  };
  const choose = (next) => { setKey(next); setAt(0); setLoops(0); setPlaying(!reducedMotion()); };
  const go = useCallback((i) => setAt((i + current.steps.length) % current.steps.length), [current.steps.length]);

  // The pointer glides to the step's target, then presses it (click / tick) or types into it.
  useLayoutEffect(() => {
    setPressed(false);
    setTypedLen(step.act === "type" && !reducedMotion() ? 0 : String(step.text || "").length);
  }, [key, at, step]);
  useLayoutEffect(() => {
    const box = stage.current?.getBoundingClientRect();
    const target = stage.current?.querySelector(`[data-t="${step.target}"]`)?.getBoundingClientRect();
    if (box && target && target.width) {
      setPointer({ x: target.left - box.left + Math.min(target.width / 2, 60), y: target.top - box.top + target.height / 2 });
      setRing({ x: target.left - box.left - 4, y: target.top - box.top - 4, w: target.width + 8, h: target.height + 8 });
    } else setRing(null);
  }, [key, at, step, layout]);

  // The chosen guide stays in view in the sideways list on phones.
  useEffect(() => {
    dialog.current?.querySelector(".howto-guide.is-on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [key, layout]);

  useEffect(() => {
    const onResize = () => setLayout((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!step.act) return undefined;
    const press = setTimeout(() => setPressed(true), reducedMotion() ? 0 : 700);
    if (step.act !== "type" || reducedMotion()) return () => clearTimeout(press);
    const text = String(step.text || "");
    let n = 0;
    const typing = setInterval(() => { n += 1; setTypedLen(n); if (n >= text.length) clearInterval(typing); }, 45);
    return () => { clearTimeout(press); clearInterval(typing); };
  }, [key, at, step]);

  // Playing: next step after the step's time; after the last, start over (up to MAX_LOOPS).
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(() => {
      if (at < current.steps.length - 1) return setAt(at + 1);
      if (loops + 1 >= MAX_LOOPS) return setPlaying(false);
      setLoops(loops + 1);
      setAt(0);
    }, stepDuration(step) + (at === current.steps.length - 1 ? 1200 : 0));
    return () => clearTimeout(timer);
  }, [playing, at, loops, step, current.steps.length]);

  function onKey(event) {
    if (event.key === "ArrowRight") { event.preventDefault(); setPlaying(false); go(at + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); setPlaying(false); go(at - 1); }
  }

  const typed = step.act === "type" ? { target: step.target, text: String(step.text || "").slice(0, typedLen) } : null;
  const titleId = `howto-title-${guide}`;

  return (
    <>
      <button type="button" className={className} data-confirm="not-needed-read-only" aria-haspopup="dialog" onClick={open}><span aria-hidden="true">▶</span> {label}</button>
      <dialog ref={dialog} className="howto-dialog" aria-labelledby={titleId} onKeyDown={onKey} onClose={() => setPlaying(false)} onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}>
        <div className="howto-head">
          <h2 id={titleId}>How it works</h2>
          <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => dialog.current?.close()}>✕ Close</button>
        </div>
        <div className="howto-body">
          {guides.length > 1 && (
            <nav className="howto-guides" aria-label="Guides">
              {guides.map((g) => (
                <button key={g} type="button" className={`howto-guide${g === key ? " is-on" : ""}`} aria-pressed={g === key} data-confirm="not-needed-read-only" onClick={() => choose(g)}>{GUIDES[g].title}</button>
              ))}
            </nav>
          )}
          <div className="howto-main">
            <h3>{current.title}</h3>
            <div ref={stage} className="howto-stage" aria-hidden="true">
              <HowToScene scene={step.scene} state={step.state} typed={typed} />
              {ring && <span className="howto-ring" style={{ transform: `translate(${ring.x}px, ${ring.y}px)`, width: ring.w, height: ring.h }} />}
              <span className={`howto-pointer${pressed && step.act !== "type" ? " is-pressed" : ""}`} style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)` }}>
                <svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2l17 11-7.5 1.6L8 23z" fill="#0d0d0d" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              </span>
            </div>
            <div className="howto-controls">
              <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" aria-label="Previous step" onClick={() => { setPlaying(false); go(at - 1); }}>‹</button>
              <button type="button" className="btn dark small" data-confirm="not-needed-read-only" onClick={() => { if (!playing) setLoops(0); setPlaying(!playing); }}>{playing ? "Pause" : "Play"}</button>
              <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" aria-label="Next step" onClick={() => { setPlaying(false); go(at + 1); }}>›</button>
              <span className="small muted">Step {at + 1} of {current.steps.length}</span>
            </div>
            <ol className="howto-steps">
              {current.steps.map((s, i) => (
                <li key={i} aria-current={i === at ? "step" : undefined}>
                  <button type="button" className="howto-step" data-confirm="not-needed-read-only" onClick={() => { setPlaying(false); setAt(i); }}><span aria-hidden="true">{i + 1}.</span><span>{s.caption}</span></button>
                </li>
              ))}
            </ol>
            <p className="sr-only" aria-live={playing ? "off" : "polite"}>Step {at + 1}: {step.caption}</p>
          </div>
        </div>
      </dialog>
    </>
  );
}
