"use client";

import { useEffect, useState } from "react";

/**
 * "Jump to" for the event editor (owner design review, 17 Nov 2026): the editor is one long page of a dozen
 * sections, so a sticky row of section links sits above it. Jumping to a collapsed section (Check-in, More
 * options) opens it; the section on screen is marked. Plain links underneath, so it works without JavaScript.
 */
export default function EditorNav({ sections }) {
  const [current, setCurrent] = useState(sections[0]?.id || "");
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length || !("IntersectionObserver" in window)) return undefined;
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null));
      const visible = [...seen.entries()].filter(([, top]) => top !== null).sort((a, b) => a[1] - b[1]);
      if (visible.length) setCurrent(visible[0][0]);
    }, { rootMargin: "-120px 0px -55% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  function jump(event, id) {
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    if (el.tagName === "DETAILS") el.open = true;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setCurrent(id);
    // Put keyboard focus on the section's heading so screen readers and Tab follow the jump.
    const head = el.querySelector("h2");
    if (head) { head.setAttribute("tabindex", "-1"); head.focus({ preventScroll: true }); }
  }

  return (
    <nav className="editor-nav" aria-label="Jump to a section">
      <span className="editor-nav-label">Jump to</span>
      <ul>
        {sections.map((s) => (
          <li key={s.id}><a href={`#${s.id}`} aria-current={current === s.id ? "true" : undefined} onClick={(e) => jump(e, s.id)}>{s.label}</a></li>
        ))}
      </ul>
    </nav>
  );
}
