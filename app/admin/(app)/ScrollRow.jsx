"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../../components/Icon";

/** Scrolls `el` sideways inside its ScrollRow (never the page) so it is fully in view. */
export function revealInRow(el) {
  const track = el?.closest(".scroll-row-track");
  if (!track) return;
  const pad = 52; // clear of the arrow buttons
  const left = el.offsetLeft - pad;
  const right = el.offsetLeft + el.offsetWidth + pad;
  if (left < track.scrollLeft) track.scrollTo({ left: Math.max(0, left) });
  else if (right > track.scrollLeft + track.clientWidth) track.scrollTo({ left: right - track.clientWidth });
}

/**
 * A row of tabs or links that may be wider than the screen (owner, 22 Nov 2026: on phones the
 * event editor's Jump to row cut "Registration" off with nothing saying there was more).
 * The row scrolls sideways as before (swipe, trackpad, Tab); a ‹ / › button with a soft fade
 * appears on a side only while there is more that way, and the current item starts in view.
 * `label` names the row for the buttons, e.g. "sections" → "Show earlier sections".
 */
export default function ScrollRow({ children, label = "items", className = "" }) {
  const track = useRef(null);
  const [edges, setEdges] = useState({ prev: false, next: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const prev = el.scrollLeft > 2;
    const next = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((e) => (e.prev === prev && e.next === next ? e : { prev, next }));
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const current = el.querySelector('[aria-current]:not([aria-current="false"]), [aria-selected="true"], .active');
    if (current) revealInRow(current);
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    if (el.firstElementChild) resize.observe(el.firstElementChild);
    return () => { el.removeEventListener("scroll", measure); resize.disconnect(); };
  }, [measure]);

  function step(direction) {
    const el = track.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * Math.max(120, el.clientWidth * 0.7), behavior: still ? "auto" : "smooth" });
  }

  return (
    <div className={`scroll-row${edges.prev ? " has-prev" : ""}${edges.next ? " has-next" : ""}${className ? ` ${className}` : ""}`}>
      <button type="button" className="scroll-row-btn is-prev" hidden={!edges.prev} aria-label={`Show earlier ${label}`} onClick={() => step(-1)}><Icon name="chevronLeft" /></button>
      <div className="scroll-row-track" ref={track}>{children}</div>
      <button type="button" className="scroll-row-btn is-next" hidden={!edges.next} aria-label={`Show more ${label}`} onClick={() => step(1)}><Icon name="chevronRight" /></button>
    </div>
  );
}
