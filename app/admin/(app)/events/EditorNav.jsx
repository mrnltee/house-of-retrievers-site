"use client";

import { useEffect, useState } from "react";
import ScrollRow, { revealInRow } from "../ScrollRow";

/**
 * "Jump to" for the event editor (owner design review, 17 Nov 2026): the editor is one long page of a dozen
 * sections, so a sticky row of section links sits above it. Jumping to a collapsed section (Check-in, More
 * options) opens it; the section on screen is marked. Plain links underneath, so it works without JavaScript.
 */
export default function EditorNav({ sections }) {
  const [current, setCurrent] = useState(sections[0]?.id || "");
  useEffect(() => {
    // The marked section is the last one whose top has reached the area just under the bar.
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (document.querySelector(".editor-nav")?.getBoundingClientRect().bottom || 0) + 48;
      let here = sections[0]?.id || "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) here = s.id;
      }
      setCurrent(here);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [sections]);
  // Keep the marked link in view inside the bar (it scrolls sideways on phones).
  useEffect(() => {
    revealInRow(document.querySelector(`.editor-nav a[href="#${current}"]`));
  }, [current]);

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
      <ScrollRow label="sections">
        <ul>
          {sections.map((s) => (
            <li key={s.id}><a href={`#${s.id}`} aria-current={current === s.id ? "true" : undefined} onClick={(e) => jump(e, s.id)}>{s.label}</a></li>
          ))}
        </ul>
      </ScrollRow>
    </nav>
  );
}
