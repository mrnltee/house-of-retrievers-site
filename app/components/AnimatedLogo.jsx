"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The logo, with a small surprise every 15–25 minutes: the two dogs swap
 * places, one barks a heart, the Golden wags its tail, or they hop.
 *
 * How the switch stays invisible:
 * - The static logo is what everyone sees. Once the page is idle, an
 *   animation copy is built on top of it, hidden: the same image clipped to
 *   the lettering, plus the two dogs as full-size layers (public/logo-parts/).
 *   Stacked, they match the static logo pixel for pixel (checked when the
 *   layers were cut), and they sit in the same box, so the browser scales
 *   them identically.
 * - When a trick starts, the copy is shown and the static logo hidden in the
 *   same frame; when it ends (everything back at rest), the reverse. Nothing
 *   fades, so nothing flickers.
 *
 * Brand rules kept: nothing is redrawn (the dogs are the logo's own pixels,
 * only moved, tilted or turned), the lettering never moves, and with
 * prefers-reduced-motion nothing plays. `?logo-fun` plays the tricks back to
 * back for review.
 */

const W = 1396;
const H = 564;
/** The lettering starts after this column; the clip sits in the clear gap before the "H". */
const WORDS_X = 577;

const FEET = { golden: [190, 495], lab: [440, 495] };
const TAIL_BASE = [331, 476];
const MUZZLE = { golden: [60, 140], lab: [566, 134] };
/** How far each dog travels to swap places, in logo pixels. */
const SWAP = { golden: 200, lab: -232 };

const MIN_WAIT = 15 * 60 * 1000;
const MAX_WAIT = 25 * 60 * 1000;
const ACTIONS = ["swap", "bark", "wag", "hop"];

const pct = (v, total) => `${(v / total) * 100}%`;
const origin = ([x, y]) => `${pct(x, W)} ${pct(y, H)}`;
const randomWait = () => MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
const isDemo = () => new URLSearchParams(window.location.search).has("logo-fun");
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

// Easing curves, named for what they do.
const EASE = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)", // fast start, soft landing
  in: "cubic-bezier(0.55, 0, 0.75, 0.25)", // gathering speed, like falling
  inOut: "cubic-bezier(0.45, 0, 0.55, 1)",
  snap: "cubic-bezier(0.2, 0.9, 0.3, 1.3)", // slight overshoot
};

function Heart({ id, at }) {
  return (
    <svg className="logo-fun-heart" data-heart={id} viewBox="0 0 24 22" aria-hidden="true"
      style={{ left: pct(at[0] - 30, W), top: pct(at[1] - 54, H), width: pct(60, W) }}>
      <path d="M12 21 2.6 11.6a5.6 5.6 0 0 1 7.9-7.9L12 5.2l1.5-1.5a5.6 5.6 0 0 1 7.9 7.9Z"
        fill="#a78440" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export default function AnimatedLogo({ variant = "reverse", className = "", alt, src, ...imgProps }) {
  const [ready, setReady] = useState(false); // the hidden copy exists
  const flatRef = useRef(null);
  const stageRef = useRef(null);
  const timer = useRef(null);
  const turn = useRef(0);
  const playing = useRef(false);

  /** Switch to the copy, run the trick, switch back. */
  const play = useCallback(async (action) => {
    const stage = stageRef.current;
    const flat = flatRef.current;
    if (!stage || !flat) return;
    playing.current = true;
    await Promise.all([...stage.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
    await nextFrame();
    stage.style.visibility = "visible";
    flat.style.visibility = "hidden";
    try {
      await perform(action, stage);
    } finally {
      await nextFrame();
      flat.style.visibility = "";
      stage.style.visibility = "hidden";
      playing.current = false;
    }
  }, []);

  const schedule = useCallback((delay) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(function fire() {
      // Save it for when someone is looking.
      if (document.hidden) {
        const onVisible = () => {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", onVisible);
          timer.current = window.setTimeout(fire, 1200);
        };
        document.addEventListener("visibilitychange", onVisible);
        return;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !stageRef.current || playing.current) {
        schedule(isDemo() ? 1000 : randomWait());
        return;
      }
      const action = isDemo() ? ACTIONS[turn.current++ % ACTIONS.length] : ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      play(action).finally(() => schedule(isDemo() ? 2500 : randomWait()));
    }, delay);
  }, [play]);

  // Build the hidden copy once the page is idle, then start the clock.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const build = () => setReady(true);
    const idle = window.requestIdleCallback ? window.requestIdleCallback(build, { timeout: 4000 }) : window.setTimeout(build, 2500);
    schedule(isDemo() ? 2000 : randomWait());
    return () => {
      window.clearTimeout(timer.current);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [schedule]);

  const part = (name) => `/logo-parts/${name}-${variant}.png`;

  return (
    <span className={`logo-fun logo-fun-${variant} ${className}`}>
      <img ref={flatRef} className="logo-fun-flat" src={src} alt={alt} {...imgProps} />
      {ready && (
        <span className="logo-fun-stage" ref={stageRef} aria-hidden="true">
          <img src={src} alt="" decoding="async" style={{ clipPath: `inset(0 0 0 ${pct(WORDS_X, W)})` }} />
          <img data-part="golden" src={part("goldenfull")} alt="" decoding="async" style={{ transformOrigin: origin(FEET.golden) }} />
          {/* For the wag only: the Golden's body and tail as separate pieces. */}
          <img data-part="body" src={part("golden")} alt="" decoding="async" style={{ transformOrigin: origin(FEET.golden), display: "none" }} />
          <img data-part="tail" src={part("tail")} alt="" decoding="async" style={{ transformOrigin: origin(TAIL_BASE), display: "none" }} />
          <img data-part="lab" src={part("lab")} alt="" decoding="async" style={{ transformOrigin: origin(FEET.lab) }} />
          <Heart id="golden" at={MUZZLE.golden} />
          <Heart id="lab" at={MUZZLE.lab} />
          <Heart id="middle" at={[(FEET.golden[0] + SWAP.golden + FEET.lab[0] + SWAP.lab) / 2, 120]} />
        </span>
      )}
    </span>
  );
}

/** translate (in logo px) · rotate · scale, about the layer's own origin. */
const pose = (u, { x = 0, y = 0, r = 0, sx = 1, sy = 1 } = {}) =>
  `translate(${x * u}px, ${y * u}px) rotate(${r}deg) scale(${sx}, ${sy})`;

/** Keyframes from [offset, pose, easing into the next] rows. Every trick starts and ends at rest. */
const frames = (u, rows) => rows.map(([offset, p, easing]) => ({ offset, transform: pose(u, p), ...(easing ? { easing } : {}) }));

/** A heart that pops with a little overshoot, floats up with a sway and fades. */
function heartFrames(u, drift) {
  return [
    { offset: 0, opacity: 0, transform: "translate(0, 0) scale(0.2)", easing: EASE.snap },
    { offset: 0.18, opacity: 1, transform: `translate(${drift * 0.15 * u}px, ${-14 * u}px) scale(1.15)`, easing: EASE.out },
    { offset: 0.32, opacity: 1, transform: `translate(${drift * 0.3 * u}px, ${-30 * u}px) scale(1)`, easing: EASE.inOut },
    { offset: 0.58, opacity: 1, transform: `translate(${(drift * 0.55 + 6) * u}px, ${-56 * u}px) scale(0.98)`, easing: EASE.inOut },
    { offset: 0.8, opacity: 0.7, transform: `translate(${(drift * 0.8 - 6) * u}px, ${-78 * u}px) scale(0.94)`, easing: EASE.inOut },
    { offset: 1, opacity: 0, transform: `translate(${drift * u}px, ${-96 * u}px) scale(0.9)` },
  ];
}

async function perform(action, stage) {
  const el = (name) => stage.querySelector(`[data-part="${name}"]`);
  const heart = (id) => stage.querySelector(`[data-heart="${id}"]`);
  const golden = el("golden");
  const body = el("body");
  const tail = el("tail");
  const lab = el("lab");
  const u = stage.clientWidth / W; // screen px per logo px
  const running = [];
  const run = (node, keyframes, options) => running.push(node.animate(keyframes, { fill: "none", ...options }).finished);
  // The Golden is one piece (tail included) for everything but the wag.
  const goldenAndTail = (keyframes, options) => run(golden, keyframes, options);

  if (action === "swap") {
    // Both dogs face away from where they're going (the Golden looks left, the
    // Labrador right), so each turns round, crouches, hops over, lands with a
    // squash, turns back to face the other, tilts its head hello, and hops
    // home, now facing the way it's travelling.
    const hop = (dx) => frames(u, [
      [0, {}, EASE.inOut],
      [0.05, { sx: -1 }, EASE.inOut], // turn round
      [0.1, { sx: -1.04, sy: 0.92 }, EASE.out], // crouch (anticipation)
      [0.2, { x: dx * 0.5, y: -48, sx: -0.97, sy: 1.06 }, EASE.in], // apex, stretched
      [0.28, { x: dx, sx: -1.07, sy: 0.9 }, EASE.out], // land, squashed
      [0.33, { x: dx, y: -3, sx: -0.99, sy: 1.02 }, EASE.inOut], // rebound
      [0.37, { x: dx, sx: -1 }, EASE.inOut],
      [0.43, { x: dx }, EASE.inOut], // turn to face the other dog
      [0.5, { x: dx, r: 3 * Math.sign(dx) }, EASE.inOut], // head tilt: hello
      [0.58, { x: dx }, EASE.inOut],
      [0.63, { x: dx }, EASE.inOut],
      [0.68, { x: dx, sx: 1.04, sy: 0.92 }, EASE.out], // crouch for home
      [0.78, { x: dx * 0.5, y: -42, sx: 0.97, sy: 1.06 }, EASE.in],
      [0.86, { sx: 1.07, sy: 0.9 }, EASE.out],
      [0.91, { y: -3, sx: 0.99, sy: 1.02 }, EASE.inOut],
      [0.95, {}, EASE.inOut],
      [1, {}],
    ]);
    goldenAndTail(hop(SWAP.golden), { duration: 4800 });
    run(lab, hop(SWAP.lab), { duration: 4800, delay: 140 });
    run(heart("middle"), heartFrames(u, 0), { duration: 1500, delay: 2150 });
  }

  if (action === "bark") {
    const dog = Math.random() < 0.5 ? "golden" : "lab";
    const f = dog === "golden" ? 1 : -1; // the Golden faces left, the Labrador right
    const woof = frames(u, [
      [0, {}, EASE.inOut],
      [0.1, { r: 2.5 * f }, EASE.inOut], // draw back (anticipation)
      [0.17, { r: -6 * f, sx: 1.02, sy: 1.04 }, EASE.snap], // woof
      [0.27, { r: 1 * f }, EASE.inOut], // recoil
      [0.36, {}, EASE.inOut],
      [0.46, { r: 2.5 * f }, EASE.inOut],
      [0.53, { r: -6 * f, sx: 1.02, sy: 1.04 }, EASE.snap], // woof
      [0.63, { r: 1 * f }, EASE.inOut],
      [0.74, {}],
      [1, {}],
    ]);
    // The other dog glances over.
    const glance = frames(u, [[0, {}, EASE.inOut], [0.3, { r: -2 * f }, EASE.inOut], [0.7, { r: -2 * f }, EASE.inOut], [1, {}]]);
    if (dog === "golden") {
      goldenAndTail(woof, { duration: 1700 });
      run(lab, glance, { duration: 1700, delay: 200 });
    } else {
      run(lab, woof, { duration: 1700 });
      goldenAndTail(glance, { duration: 1700, delay: 200 });
    }
    run(heart(dog), heartFrames(u, dog === "golden" ? 14 : -14), { duration: 1700, delay: 280 });
  }

  if (action === "wag") {
    // A decaying wag about the base of the tail; the Labrador sways along, a beat behind.
    // Body and tail are separate pieces just for this; they meet exactly at rest.
    golden.style.display = "none";
    body.style.display = "";
    tail.style.display = "";
    const amps = [0, -30, 26, -26, 22, -20, 16, -12, 7, -3, 0];
    run(tail, amps.map((a, i) => ({ offset: i / (amps.length - 1), transform: `rotate(${a}deg)`, easing: EASE.inOut })), { duration: 2100 });
    run(lab, frames(u, [[0, {}, EASE.inOut], [0.25, { r: 2.4 }, EASE.inOut], [0.5, { r: -2.4 }, EASE.inOut], [0.75, { r: 1.2 }, EASE.inOut], [1, {}]]), { duration: 2100, delay: 150 });
  }

  if (action === "hop") {
    const jump = (height) => frames(u, [
      [0, {}, EASE.inOut],
      [0.14, { sx: 1.05, sy: 0.9 }, EASE.out], // crouch
      [0.36, { y: -height, sx: 0.96, sy: 1.07 }, EASE.in], // up, stretched
      [0.54, { sx: 1.07, sy: 0.9 }, EASE.out], // land, squashed
      [0.66, { y: -height * 0.18, sx: 0.99, sy: 1.02 }, EASE.in], // little second bounce
      [0.76, { sx: 1.02, sy: 0.97 }, EASE.out],
      [0.86, {}],
      [1, {}],
    ]);
    goldenAndTail(jump(62), { duration: 1300 });
    run(lab, jump(56), { duration: 1300, delay: 320 });
  }

  await Promise.all(running);
  golden.style.display = "";
  body.style.display = "none";
  tail.style.display = "none";
}
