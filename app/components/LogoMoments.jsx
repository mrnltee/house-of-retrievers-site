"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GOLDEN_PATH, LAB_PATH, LOGO_VIEWBOX, logoRig } from "../lib/logoMomentsRig.mjs";
import { logoTiming, momentSetFor, nextGap, pickMoment } from "../lib/logoMoments.mjs";

const ALT = "The House of Retrievers Society Inc. — Paws for a Purpose";
const WORDMARK = {
  light: "/house-of-retrievers-wordmark-original.png",
  dark: "/house-of-retrievers-wordmark-reverse.png",
};

function Wordmark({ tone, priority }) {
  const loading = priority ? { fetchPriority: "high" } : { loading: "lazy" };
  const img = (
    <img
      className="hor-logo-wordmark"
      src={tone === "dark" ? WORDMARK.dark : WORDMARK.light}
      alt={ALT}
      width="1396"
      height="564"
      {...loading}
    />
  );
  if (tone !== "auto") return img;
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={WORDMARK.dark} />
      {img}
    </picture>
  );
}

// One dog: the still body with every moving part cut out, then each part as
// the same silhouette clipped to its piece and pivoting on its joint.
function Dog({ name, path, uid }) {
  const rig = logoRig[name];
  const pathId = `${uid}-${name}`;
  const parts = Object.entries(rig.parts);
  return (
    <g className={`hor-dog hor-${name}`} style={{ transformOrigin: rig.lean }}>
      <defs>
        <path id={pathId} d={path} />
        <mask id={`${pathId}-body`} maskUnits="userSpaceOnUse" x="0" y="0" width="1396" height="564">
          <rect width="1396" height="564" fill="#fff" />
          {parts.map(([part, { cut }]) => <polygon key={part} points={cut} fill="#000" />)}
        </mask>
        {parts.map(([part, { clip }]) => (
          <clipPath key={part} id={`${pathId}-${part}`}>
            <polygon points={clip} />
          </clipPath>
        ))}
      </defs>
      <use href={`#${pathId}`} mask={`url(#${pathId}-body)`} />
      {parts.map(([part, { origin }]) => (
        <g key={part} className={`hor-part hor-${name}-${part}`} style={{ transformOrigin: origin }}>
          <use href={`#${pathId}`} clipPath={`url(#${pathId}-${part})`} />
        </g>
      ))}
    </g>
  );
}

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * The House of Retrievers logo with the two dogs alive. At rest it is the
 * static logo; every few seconds one dog (or both) has a short moment.
 *
 * @param {{ tone?: "light" | "dark" | "auto", scheme?: "light" | "dark", priority?: boolean, className?: string }} props
 * `tone` is the surface the logo sits on: "dark" uses the white Labrador and
 * wordmark, "light" the near-black ones, "auto" follows the colour scheme.
 * Which moments play follows the visitor's colour scheme, whatever the tone,
 * unless `scheme` pins it: a page with its own light/dark switch (the
 * countdown) passes the theme it is showing.
 */
export default function LogoMoments({ tone = "auto", scheme, priority = false, className = "" }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const rootRef = useRef(null);
  const [moment, setMoment] = useState(null);
  const schemeRef = useRef(scheme);
  schemeRef.current = scheme;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let playing = null;
    let previousId = null;
    let autoplayed = 0;
    let inView = true;
    let gapTimer;
    let endTimer;

    const canPlay = () => !reducedMotion.matches && !playing && inView && document.visibilityState === "visible";

    const play = () => {
      if (!canPlay()) return false;
      const next = pickMoment(momentSetFor(schemeRef.current ?? (prefersDark() ? "dark" : "light")), previousId);
      playing = next;
      previousId = next.id;
      setMoment(next);
      endTimer = window.setTimeout(() => {
        playing = null;
        setMoment(null);
      }, next.duration);
      return true;
    };

    const schedule = (delay) => {
      window.clearTimeout(gapTimer);
      if (autoplayed >= logoTiming.autoplayLimit) return;
      gapTimer = window.setTimeout(() => {
        if (play()) autoplayed += 1;
        schedule(nextGap() + (playing?.duration ?? 0));
      }, delay);
    };

    // A visitor pointing at or focusing the logo always gets a moment, even
    // after the unprompted ones have run out.
    const target = root.closest("a, .brand") ?? root;
    const onInvite = () => play();
    target.addEventListener("pointerenter", onInvite);
    target.addEventListener("focusin", onInvite);

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    });
    observer.observe(root);

    schedule(logoTiming.firstDelay);

    return () => {
      window.clearTimeout(gapTimer);
      window.clearTimeout(endTimer);
      observer.disconnect();
      target.removeEventListener("pointerenter", onInvite);
      target.removeEventListener("focusin", onInvite);
    };
  }, []);

  return (
    <span ref={rootRef} className={`hor-logo ${className}`.trim()} data-tone={tone}>
      <Wordmark tone={tone} priority={priority} />
      <svg
        className="hor-logo-dogs"
        viewBox={LOGO_VIEWBOX}
        aria-hidden="true"
        focusable="false"
        data-moment={moment?.id}
        style={moment ? { "--hor-moment-duration": `${moment.duration}ms` } : undefined}
      >
        <Dog name="lab" path={LAB_PATH} uid={uid} />
        <Dog name="golden" path={GOLDEN_PATH} uid={uid} />
      </svg>
    </span>
  );
}
