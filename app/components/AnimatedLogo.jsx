"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The logo, with a small surprise every 15–25 minutes: the two dogs swap
 * places, one barks a heart, the Golden wags its tail, or they hop.
 *
 * Brand rules kept:
 * - Nothing is redrawn. The dogs are the logo's own pixels, cut into layers
 *   (public/logo-parts/, made from the two logo PNGs), and are only moved or
 *   tilted. Poses the logo doesn't contain (standing, yawning) would need new
 *   artwork, so they are not here.
 * - The lettering is never animated: it stays the original image, clipped to
 *   the wordmark while the dog layers play over it.
 * - prefers-reduced-motion: no animations at all.
 *
 * `?logo-fun` in the address plays one right away and then every few seconds,
 * for reviewing.
 */

const W = 1396;
const H = 564;
/** Where the wordmark starts in the logo image; everything left of it is the dogs. */
const WORDS_X = 576;

/** Layer boxes in logo pixels [x, y, w, h], per logo file. */
const LAYERS = {
  reverse: { golden: [53, 95, 280, 406], tail: [328, 461, 69, 39], lab: [312, 100, 264, 400] },
  original: { golden: [54, 101, 280, 399], tail: [328, 452, 71, 48], lab: [313, 100, 263, 399] },
};
/** Fixed points in logo pixels. */
const FEET = { golden: [190, 495], lab: [440, 495] };
const TAIL_BASE = [331, 476];
const MUZZLE = { golden: [58, 140], lab: [566, 134] };
/** How far each dog travels to swap places, in logo pixels. */
const SWAP = { golden: 200, lab: -232 };

const MIN_WAIT = 15 * 60 * 1000;
const MAX_WAIT = 25 * 60 * 1000;
const ACTIONS = ["swap", "bark", "wag", "hop"];

const pct = (value, total) => `${(value / total) * 100}%`;

function boxStyle([x, y, w, h], origin) {
  return {
    left: pct(x, W),
    top: pct(y, H),
    width: pct(w, W),
    height: pct(h, H),
    transformOrigin: origin ? `${pct(origin[0] - x, w)} ${pct(origin[1] - y, h)}` : undefined,
  };
}

function Heart({ dog, run }) {
  const [x, y] = MUZZLE[dog];
  return (
    <svg
      className="logo-fun-heart"
      data-heart={dog}
      data-run={run}
      viewBox="0 0 24 22"
      aria-hidden="true"
      style={{ left: pct(x - 32, W), top: pct(y - 40, H), width: pct(64, W) }}
    >
      <path d="M12 21 2.6 11.6a5.6 5.6 0 0 1 7.9-7.9L12 5.2l1.5-1.5a5.6 5.6 0 0 1 7.9 7.9Z" fill="#a78440" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export default function AnimatedLogo({ variant = "reverse", className = "", alt, ...imgProps }) {
  const [action, setAction] = useState(null);
  const stageRef = useRef(null);
  const timer = useRef(null);
  const turn = useRef(0);
  const boxes = LAYERS[variant];
  const base = `/logo-parts`;

  const schedule = useCallback((delay) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const play = () => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return schedule(randomWait());
        const demo = new URLSearchParams(window.location.search).has("logo-fun");
        const next = demo ? ACTIONS[turn.current++ % ACTIONS.length] : ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
        setAction(next);
      };
      // A hidden tab saves the moment for when someone is looking.
      if (document.hidden) {
        const onVisible = () => {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", onVisible);
          window.setTimeout(play, 1200);
        };
        document.addEventListener("visibilitychange", onVisible);
      } else play();
    }, delay);
  }, []);

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).has("logo-fun");
    schedule(demo ? 1500 : randomWait());
    // Fetch the dog layers while the page is idle, so the first trick is instant.
    const preload = () => ["golden", "tail", "lab"].forEach((part) => {
      const img = new Image();
      img.src = `${base}/${part}-${variant}.png`;
    });
    const idle = window.requestIdleCallback ? window.requestIdleCallback(preload, { timeout: 5000 }) : window.setTimeout(preload, 3000);
    return () => {
      window.clearTimeout(timer.current);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [schedule, variant, base]);

  // Play the chosen trick once the layers are decoded, then go back to the plain logo.
  useEffect(() => {
    if (!action || !stageRef.current) return undefined;
    let cancelled = false;
    const stage = stageRef.current;
    const imgs = [...stage.querySelectorAll("img")];
    Promise.all(imgs.map((img) => img.decode().catch(() => {}))).then(async () => {
      if (cancelled) return;
      stage.parentElement.classList.add("is-playing");
      try {
        await perform(action, stage);
      } finally {
        if (!cancelled) {
          stage.parentElement.classList.remove("is-playing");
          setAction(null);
          const demo = new URLSearchParams(window.location.search).has("logo-fun");
          schedule(demo ? 4000 : randomWait());
        }
      }
    });
    return () => {
      cancelled = true;
      stage.parentElement?.classList.remove("is-playing");
    };
  }, [action, schedule]);

  return (
    <span className={`logo-fun logo-fun-${variant} ${className}`}>
      <img className="logo-fun-flat" alt={alt} {...imgProps} />
      {action && (
        <span className="logo-fun-stage" ref={stageRef} aria-hidden="true">
          <img data-part="golden" src={`${base}/golden-${variant}.png`} alt="" style={boxStyle(boxes.golden, FEET.golden)} />
          <img data-part="tail" src={`${base}/tail-${variant}.png`} alt="" style={boxStyle(boxes.tail, TAIL_BASE)} />
          <img data-part="lab" src={`${base}/lab-${variant}.png`} alt="" style={boxStyle(boxes.lab, FEET.lab)} />
          {action === "bark" && (
            <>
              <Heart dog="golden" run={0} />
              <Heart dog="lab" run={0} />
            </>
          )}
        </span>
      )}
    </span>
  );
}

function randomWait() {
  return MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
}

/** A layer's box in logo pixels, read back from its inline style. */
function boxOf(el) {
  const n = (v, total) => (parseFloat(v) / 100) * total;
  return [n(el.style.left, W), n(el.style.top, H), n(el.style.width, W), n(el.style.height, H)];
}

/** Runs one trick with the Web Animations API; resolves when it's over. */
async function perform(action, stage) {
  const part = (name) => stage.querySelector(`[data-part="${name}"]`);
  const golden = part("golden");
  const tail = part("tail");
  const lab = part("lab");
  const unit = stage.clientWidth / W; // screen pixels per logo pixel
  const all = [];
  const run = (el, frames, options) => {
    const a = el.animate(frames, { fill: "both", easing: "ease-in-out", ...options });
    all.push(a.finished);
    return a;
  };
  // The tail moves with the Golden's body, turning about the same point.
  const withTail = (frames, options) => {
    const [x, y, w, h] = boxOf(tail);
    tail.style.transformOrigin = `${pct(FEET.golden[0] - x, w)} ${pct(FEET.golden[1] - y, h)}`;
    run(golden, frames, options);
    run(tail, frames, options);
  };

  if (action === "swap") {
    const g = SWAP.golden * unit;
    const l = SWAP.lab * unit;
    const hop = -26 * unit;
    const there = (dx) => [
      { transform: "translate(0, 0)" },
      { transform: `translate(${dx / 2}px, ${hop}px)`, offset: 0.5 },
      { transform: `translate(${dx}px, 0)` },
    ];
    const back = (dx) => [
      { transform: `translate(${dx}px, 0)` },
      { transform: `translate(${dx / 2}px, ${hop}px)`, offset: 0.5 },
      { transform: "translate(0, 0)" },
    ];
    withTail(there(g), { duration: 900 });
    run(lab, there(l), { duration: 900, delay: 120 });
    await Promise.all(all.splice(0));
    // A little hello while they're swapped.
    await new Promise((r) => setTimeout(r, 2400));
    withTail(back(g), { duration: 900, delay: 120 });
    run(lab, back(l), { duration: 900 });
  }

  if (action === "bark") {
    const dog = Math.random() < 0.5 ? "golden" : "lab";
    const el = dog === "golden" ? golden : lab;
    const lean = dog === "golden" ? -5 : 5;
    const woof = [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${lean}deg) scaleY(1.03)`, offset: 0.25 },
      { transform: "rotate(0deg)", offset: 0.5 },
      { transform: `rotate(${lean}deg) scaleY(1.03)`, offset: 0.75 },
      { transform: "rotate(0deg)" },
    ];
    if (dog === "golden") withTail(woof, { duration: 1100 });
    else run(el, woof, { duration: 1100 });
    const heart = stage.querySelector(`[data-heart="${dog}"]`);
    const drift = (dog === "golden" ? 22 : -22) * unit;
    const rise = -80 * unit;
    run(heart, [
      { opacity: 0, transform: "translate(0, 0) scale(0.3)" },
      { opacity: 1, transform: `translate(${drift * 0.3}px, ${rise * 0.3}px) scale(1.15)`, offset: 0.25 },
      { opacity: 1, transform: `translate(${drift * 0.7}px, ${rise * 0.7}px) scale(1)`, offset: 0.7 },
      { opacity: 0, transform: `translate(${drift}px, ${rise}px) scale(0.9)` },
    ], { duration: 1800, delay: 200, easing: "ease-out" });
  }

  if (action === "wag") {
    const [tx, ty, tw, th] = boxOf(tail);
    tail.style.transformOrigin = `${pct(TAIL_BASE[0] - tx, tw)} ${pct(TAIL_BASE[1] - ty, th)}`;
    const frames = [];
    for (let i = 0; i <= 10; i += 1) frames.push({ transform: `rotate(${i === 0 || i === 10 ? 0 : i % 2 ? -26 : 22}deg)` });
    run(tail, frames, { duration: 1700 });
    const sway = [];
    for (let i = 0; i <= 6; i += 1) sway.push({ transform: `rotate(${i === 0 || i === 6 ? 0 : i % 2 ? 3 : -3}deg)` });
    run(lab, sway, { duration: 1700 });
  }

  if (action === "hop") {
    const jump = (dy) => [
      { transform: "translateY(0) scaleY(1)" },
      { transform: "translateY(0) scaleY(0.94)", offset: 0.15 },
      { transform: `translateY(${dy}px) scaleY(1.03)`, offset: 0.45 },
      { transform: "translateY(0) scaleY(0.97)", offset: 0.8 },
      { transform: "translateY(0) scaleY(1)" },
    ];
    withTail(jump(-64 * unit), { duration: 750 });
    run(lab, jump(-58 * unit), { duration: 750, delay: 380 });
  }

  await Promise.all(all);
}
