"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import { HERO_SLIDE_MS, MEDIA_HERO_SLIDES } from "../lib/mediaHeroSlides.mjs";

/**
 * The media hub hero's background: a slow crossfade with a gentle zoom through
 * MEDIA_HERO_SLIDES. Decorative (the photos are hidden from screen readers).
 * The section's own CSS background is the first photo, so nothing changes until
 * the next one has loaded. It never moves under reduced motion, off screen or in
 * a hidden tab, and has its own Pause / Play (WCAG 2.2.2), like EventMedia.
 */
export default function HeroSlides() {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(() => new Set());
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const wrap = useRef(null);
  const count = MEDIA_HERO_SLIDES.length;
  const next = (index + 1) % count;
  const playing = mounted && !reducedMotion && !paused && visible;

  useEffect(() => {
    setMounted(true);
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    let inView = false;
    const update = () => setVisible(inView && document.visibilityState === "visible");
    const io = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); }, { threshold: 0.2 });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);

  // Move on only once the next photo is in, so a slow connection holds the current one instead of fading to black.
  useEffect(() => {
    if (!playing || !loaded.has(next)) return undefined;
    const timer = setTimeout(() => setIndex(next), HERO_SLIDE_MS);
    return () => clearTimeout(timer);
  }, [playing, index, next, loaded]);

  const markLoaded = (i) => setLoaded((s) => (s.has(i) ? s : new Set(s).add(i)));
  // The one showing and the one after it (and any already in); the rest wait their turn.
  const wanted = (i) => i === index || i === next || loaded.has(i);
  const frames = ["media-hero-frames", loaded.has(0) && "is-ready", !playing && "is-still"].filter(Boolean).join(" ");

  return (
    <div ref={wrap} className="media-hero-slides">
      <div className={frames} aria-hidden="true">
        {mounted && !reducedMotion && MEDIA_HERO_SLIDES.map((slide, i) => wanted(i) && (
          <img
            key={slide.src}
            className={`media-hero-slide${i === index ? " is-active" : ""}`}
            src={slide.src}
            alt=""
            style={{ objectPosition: slide.position }}
            decoding="async"
            ref={(img) => { if (img?.complete && img.naturalWidth) markLoaded(i); }}
            onLoad={() => markLoaded(i)}
          />
        ))}
      </div>
      {mounted && !reducedMotion && (
        <button
          type="button"
          className="media-hero-play"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play background slideshow" : "Pause background slideshow"}
          title={paused ? "Play background slideshow" : "Pause background slideshow"}
        >
          <Icon name={paused ? "play" : "pause"} size={16} />
        </button>
      )}
    </div>
  );
}
