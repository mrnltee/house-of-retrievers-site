"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";

/**
 * The media hub hero's background: a crossfade, with an optional slow zoom, through
 * the photos chosen in Admin → Media hub (`heroSlides` in app/lib/mediaHeroSlides.mjs).
 * Each photo shows for `seconds` (its fade included) and fades into the next over `fade`.
 * Decorative (the photos are hidden from screen readers). The section's own CSS background
 * is the original poster, shown until the first photo is in. One photo stays still; it never
 * moves under reduced motion, off screen or in a hidden tab, and has its own Pause / Play
 * (WCAG 2.2.2), like EventMedia. The editor's preview draws the same component.
 */
export default function HeroSlides({ slides = [], seconds = 6, fade = 2, zoom = true }) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(-1);
  const [loaded, setLoaded] = useState(() => new Set());
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const wrap = useRef(null);
  const count = slides.length;
  const moving = count > 1;
  const next = (index + 1) % count;
  const playing = moving && mounted && !reducedMotion && !paused && visible;

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
    let frame = 0;
    const timer = setTimeout(() => {
      // The photo coming in must start from invisible. With two photos it is the one that just left (still fully
      // shown underneath), so first let it drop out of sight behind the current photo, then fade it in a frame later.
      setLeaving(-1);
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => { setLeaving(index); setIndex(next); }); });
    }, seconds * 1000);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [playing, index, next, loaded, seconds]);

  // Decoded before it counts as in, so the fade never waits on decoding mid-frame.
  const decoding = useRef(new Set());
  const markLoaded = (i, img) => {
    if (!img || decoding.current.has(i)) return;
    decoding.current.add(i);
    const done = () => setLoaded((s) => (s.has(i) ? s : new Set(s).add(i)));
    (img.decode ? img.decode() : Promise.resolve()).then(done, done);
  };
  // The one showing and the one after it (and any already in); the rest wait their turn.
  const wanted = (i) => i === index || i === next || loaded.has(i);
  const frames = ["media-hero-frames", loaded.has(0) && "is-ready", !playing && "is-still", !zoom && "no-zoom"].filter(Boolean).join(" ");
  // The zoom outlasts a photo's whole time on screen (showing, then covered by the next fade), so it never stops mid-view.
  const timing = { "--hero-fade": `${fade}s`, "--hero-zoom": `${Math.ceil((seconds + fade) * 1.4)}s` };
  if (!count) return null;

  return (
    <div ref={wrap} className="media-hero-slides" style={timing}>
      <div className={frames} aria-hidden="true">
        {mounted && !reducedMotion && slides.map((slide, i) => wanted(i) && (
          <img
            key={slide.src}
            className={`media-hero-slide${i === index ? " is-active" : i === leaving ? " is-leaving" : ""}`}
            src={slide.src}
            alt=""
            style={{ objectPosition: slide.position }}
            decoding="async"
            ref={(img) => { if (img?.complete && img.naturalWidth) markLoaded(i, img); }}
            onLoad={(e) => markLoaded(i, e.currentTarget)}
          />
        ))}
      </div>
      {moving && mounted && !reducedMotion && (
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
