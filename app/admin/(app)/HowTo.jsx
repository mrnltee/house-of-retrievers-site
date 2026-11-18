"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { BRAND_GUIDES, GUIDES, stepDuration } from "../../lib/admin/howToGuides.mjs";
import HowToScene from "./HowToScenes";
import Icon from "../../components/Icon";

/** Plays stop after this many loops, so nothing keeps moving unattended (WCAG 2.2.2). */
const MAX_LOOPS = 3;
/** The camera and pointer take this long to arrive before a press, typing or a reveal (ms). */
const GLIDE = 900;
/** How close the camera frames a step's target when the step doesn't say. */
const DEFAULT_ZOOM = 1.25;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The current scale of an element's CSS transform (1 when there is none). */
function scaleOf(el) {
  const t = el ? getComputedStyle(el).transform : "none";
  if (!t || t === "none") return 1;
  const m = t.match(/matrix\(([^)]+)\)/);
  return m ? Number(m[1].split(",")[0]) || 1 : 1;
}

/**
 * "▶ How it works" (owner, 2026-11-15) and the welcome film (owner, 2026-11-18): an animated guide in a dialog.
 * A camera eases in on what matters, a pointer glides there on a gentle curve and presses, types or ticks, new
 * things shimmer in, and the plan beside it ticks off step by step. Play / Pause, ‹ › and the plan move through
 * it. `autoOpen` (a storage key) opens it once per browser; `ending` shows an end card instead of looping.
 * With reduced motion it doesn't play by itself, the camera stays wide and nothing glides.
 */
export default function HowTo({ guide = BRAND_GUIDES[0], guides = BRAND_GUIDES, label = "How it works", className = "btn ghost small", heading = "How it works", autoOpen = "", ending = null, hideButton = false }) {
  const dialog = useRef(null);
  const stage = useRef(null);
  const camera = useRef(null);
  const [key, setKey] = useState(guide);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loops, setLoops] = useState(0);
  const [finished, setFinished] = useState(false);
  const [pointer, setPointer] = useState({ x: 40, y: 40 });
  const [ring, setRing] = useState(null); // the highlight around the step's target, in the camera's own units
  const [cam, setCam] = useState({ x: 0, y: 0, z: 1 });
  const [pressed, setPressed] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [typedLen, setTypedLen] = useState(0);
  // Bumped on open and on resize, so things are measured once the dialog is really on screen.
  const [layout, setLayout] = useState(0);
  const current = GUIDES[key] || GUIDES[BRAND_GUIDES[0]];
  const step = current.steps[at];
  const last = at === current.steps.length - 1;

  const open = useCallback(() => {
    setKey(guide);
    setAt(0);
    setLoops(0);
    setFinished(false);
    setPlaying(!reducedMotion());
    dialog.current?.showModal();
    setLayout((n) => n + 1);
  }, [guide]);
  const choose = (next) => { setKey(next); setAt(0); setLoops(0); setFinished(false); setPlaying(!reducedMotion()); };
  const go = useCallback((i) => { setFinished(false); setAt((i + current.steps.length) % current.steps.length); }, [current.steps.length]);

  // The welcome film opens by itself once per browser.
  useEffect(() => {
    if (!autoOpen) return;
    let seen = true;
    try { seen = localStorage.getItem(autoOpen) === "1"; localStorage.setItem(autoOpen, "1"); } catch {}
    if (!seen) open();
  }, [autoOpen, open]);

  useLayoutEffect(() => {
    setPressed(false);
    setArrived(false);
    setTypedLen(step.act === "type" && !reducedMotion() ? 0 : String(step.text || "").length);
  }, [key, at, step]);

  // Measure the target in the camera's own (unscaled) units, then frame it: the camera eases in on it and the
  // pointer and ring move inside the camera, so they stay on the target while it moves.
  useLayoutEffect(() => {
    const box = stage.current;
    const layer = camera.current;
    const el = layer?.querySelector(`[data-t="${step.target}"]`);
    if (!box || !layer) return;
    const s = scaleOf(layer);
    const lr = layer.getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    const W = box.clientWidth;
    const H = box.clientHeight;
    if (!r || !r.width) { setRing(null); setCam({ x: 0, y: 0, z: 1 }); return; }
    const t = { x: (r.left - lr.left) / s, y: (r.top - lr.top) / s, w: r.width / s, h: r.height / s };
    setPointer({ x: t.x + Math.min(t.w / 2, 60), y: t.y + t.h / 2 });
    setRing({ x: t.x - 4, y: t.y - 4, w: t.w + 8, h: t.h + 8 });
    // Phones keep the whole mock in view: zooming a narrow stage only squeezes it.
    const z = reducedMotion() || W < 560 ? 1 : Math.max(1, step.zoom ?? DEFAULT_ZOOM);
    const clamp = (v, min) => Math.min(0, Math.max(min, v));
    // A screen taller than the stage (a long page) lets the camera pan down to what's below.
    const tall = Math.max(H, layer.querySelector(".ht-screen.ht-page")?.offsetHeight || 0);
    setCam({ x: clamp(W / 2 - (t.x + t.w / 2) * z, W - W * z), y: clamp(H / 2 - (t.y + t.h / 2) * z, H - tall * z), z });
  }, [key, at, step, layout]);

  // Measure again once the new scene has dissolved in and settled, so the ring and pointer land exactly.
  useEffect(() => {
    const a = setTimeout(() => setLayout((n) => n + 1), 120);
    const b = setTimeout(() => setLayout((n) => n + 1), 650);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [key, at]);

  // The chosen guide stays in view in the sideways list on phones.
  useEffect(() => {
    dialog.current?.querySelector(".howto-guide.is-on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [key, layout]);

  useEffect(() => {
    const onResize = () => setLayout((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Once the camera and pointer arrive: press, type, or let the new thing shimmer in.
  useEffect(() => {
    const still = reducedMotion();
    const arrive = setTimeout(() => setArrived(true), still ? 0 : GLIDE);
    if (!step.act) return () => clearTimeout(arrive);
    const press = setTimeout(() => setPressed(true), still ? 0 : GLIDE + 120);
    if (step.act !== "type" || still) return () => { clearTimeout(arrive); clearTimeout(press); };
    const text = String(step.text || "");
    let n = 0;
    let typing;
    const start = setTimeout(() => { typing = setInterval(() => { n += 1; setTypedLen(n); if (n >= text.length) clearInterval(typing); }, 45); }, GLIDE);
    return () => { clearTimeout(arrive); clearTimeout(press); clearTimeout(start); clearInterval(typing); };
  }, [key, at, step]);

  // Playing: next step after the step's time; after the last, the end card (welcome) or start over (guides).
  const duration = stepDuration(step) + GLIDE + (last ? 1200 : 0);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(() => {
      if (!last) return setAt(at + 1);
      if (ending) { setPlaying(false); setFinished(true); return; }
      if (loops + 1 >= MAX_LOOPS) return setPlaying(false);
      setLoops(loops + 1);
      setAt(0);
    }, duration);
    return () => clearTimeout(timer);
  }, [playing, at, loops, last, duration, ending]);

  function onKey(event) {
    if (event.key === "ArrowRight") { event.preventDefault(); setPlaying(false); go(at + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); setPlaying(false); go(at - 1); }
  }

  const typed = step.act === "type" ? { target: step.target, text: String(step.text || "").slice(0, typedLen) } : null;
  const titleId = `howto-title-${useId().replace(/:/g, "")}`;
  const close = () => dialog.current?.close();

  return (
    <>
      {!hideButton && <button type="button" className={className} data-confirm="not-needed-read-only" aria-haspopup="dialog" onClick={open}><Icon name="play" /> {label}</button>}
      <dialog ref={dialog} className={`howto-dialog${ending ? " is-film" : ""}`} aria-labelledby={titleId} onKeyDown={onKey} onClose={() => setPlaying(false)} onClick={(e) => { if (e.target === dialog.current) close(); }}>
        <div className="howto-head">
          <h2 id={titleId}>{heading}</h2>
          <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={close}><Icon name="close" /> {ending ? "Skip" : "Close"}</button>
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
            <div ref={stage} className="howto-stage" aria-hidden="true">
              <div ref={camera} className="howto-camera" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})` }}>
                <div className="howto-scene" key={`${key}-${step.scene}`}>
                  <HowToScene scene={step.scene} state={step.state} typed={typed} />
                </div>
                {ring && (step.build
                  ? <span key={`b-${key}-${at}`} className={`howto-build${arrived ? " is-on" : ""}`} style={{ transform: `translate(${ring.x}px, ${ring.y}px)`, width: ring.w, height: ring.h }} />
                  : <span className="howto-ring" style={{ transform: `translate(${ring.x}px, ${ring.y}px)`, width: ring.w, height: ring.h, borderWidth: 3 / cam.z }} />)}
                <span className="howto-pointer-x" style={{ transform: `translateX(${pointer.x}px)` }}>
                  <span className={`howto-pointer${pressed && step.act !== "type" ? " is-pressed" : ""}`} style={{ transform: `translateY(${pointer.y}px)` }}>
                    <span className="howto-pointer-size" style={{ transform: `scale(${1 / cam.z})` }}>
                      <svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2l17 11-7.5 1.6L8 23z" fill="#0d0d0d" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                    </span>
                  </span>
                </span>
              </div>
              <span className="howto-caption" key={`c-${key}-${at}`}>{step.caption}</span>
              {finished && ending && (
                <div className="howto-end">
                  <strong>{ending.title}</strong>
                  <p>{ending.text}</p>
                </div>
              )}
            </div>
            {finished && ending ? (
              <div className="howto-controls">
                {ending.actions}
                <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => { setFinished(false); setAt(0); setPlaying(!reducedMotion()); }}>Watch again</button>
              </div>
            ) : (
              <div className="howto-controls">
                <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" aria-label="Previous step" onClick={() => { setPlaying(false); go(at - 1); }}><Icon name="chevronLeft" size={20} /></button>
                <button type="button" className="btn dark small" data-confirm="not-needed-read-only" onClick={() => { if (!playing) setLoops(0); setFinished(false); setPlaying(!playing); }}>{playing ? "Pause" : "Play"}</button>
                <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" aria-label="Next step" onClick={() => { setPlaying(false); go(at + 1); }}><Icon name="chevronRight" size={20} /></button>
                <span className="howto-progress" aria-hidden="true"><i key={`p-${key}-${at}-${playing}`} className={playing ? "is-running" : ""} style={{ animationDuration: `${duration}ms` }} /></span>
                <span className="small muted">Step {at + 1} of {current.steps.length}</span>
              </div>
            )}
          </div>
          <aside className="howto-plan">
            <h3><span className="howto-plan-mark" aria-hidden="true"><Icon name="sparkle" /></span>{current.title}</h3>
            <ol className="howto-steps">
              {current.steps.map((s, i) => {
                const done = i < at || (finished && i === at);
                return (
                  <li key={i} aria-current={i === at && !finished ? "step" : undefined} className={done ? "is-done" : i === at ? "is-now" : ""}>
                    <button type="button" className="howto-step" data-confirm="not-needed-read-only" onClick={() => { setPlaying(false); go(i); }}>
                      <span className="howto-step-mark" aria-hidden="true">{done ? <Icon name="check" /> : i === at ? <span className={`howto-spin${playing ? " is-on" : ""}`} /> : i + 1}</span>
                      <span>{s.caption}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>
          <p className="sr-only" aria-live={playing ? "off" : "polite"}>Step {at + 1}: {step.caption}</p>
        </div>
      </dialog>
    </>
  );
}
