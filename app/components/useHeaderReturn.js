"use client";

import { useEffect, useState } from "react";

/**
 * The site header scrolls away with the hero, then slides back in at the top
 * of the screen whenever the visitor scrolls up (audit #3, 23 Nov 2026), so
 * Events and Join are one flick away anywhere on a long page. It stays pinned
 * until the page is back at the top, where the normal header takes over in
 * the same place, so nothing jumps. `keepShown` holds it while the phone menu
 * is open; keyboard focus inside it also shows it (CSS :focus-within).
 */
export default function useHeaderReturn(keepShown = false) {
  const [state, setState] = useState({ stuck: false, shown: false });
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;
      setState((s) => {
        const stuck = s.stuck ? y > 2 : y > 320;
        let shown = stuck && s.shown;
        if (stuck && delta < -6) shown = true;
        if (delta > 6) shown = false;
        return s.stuck === stuck && s.shown === shown ? s : { stuck, shown };
      });
      if (Math.abs(delta) > 6) last = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return `site-header${state.stuck ? " is-stuck" : ""}${state.stuck && (state.shown || keepShown) ? " is-shown" : ""}`;
}
