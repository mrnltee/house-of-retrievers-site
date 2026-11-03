"use client";

import { useEffect } from "react";

/** Round logo frames, site and admin. HOR's own logo and the bank logos are left alone. */
const FRAMES = [
  ".supporter-logo",
  ".supporter-card-logo",
  ".logo-preview.brand-circle",
  ".event-supporter-logo",
  ".event-beneficiary-logo",
  ".beneficiary-logo-circle",
  ".logo-scale-preview",
  ".row-avatar.is-logo",
].join(", ");
const SIZE = 48;
const RING = 2;
const seen = new Map(); // src -> colour string, or "" for a see-through edge

/**
 * The colour around a logo's edge, so the circle behind it blends in: the most common
 * colour among the outer pixels (bucketed, then averaged). A see-through edge, or one
 * that can't be read (another site without CORS), gives "" and the circle stays white.
 */
function edgeColour(src) {
  if (seen.has(src)) return Promise.resolve(seen.get(src));
  return new Promise((resolve) => {
    const img = new Image();
    if (!/^(data|blob):/.test(src)) img.crossOrigin = "anonymous";
    const done = (colour) => { seen.set(src, colour); resolve(colour); };
    img.onerror = () => done("");
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        const buckets = new Map();
        let edge = 0;
        let solid = 0;
        for (let y = 0; y < SIZE; y++) {
          for (let x = 0; x < SIZE; x++) {
            if (x >= RING && x < SIZE - RING && y >= RING && y < SIZE - RING) continue;
            edge++;
            const i = (y * SIZE + x) * 4;
            if (data[i + 3] < 200) continue;
            solid++;
            const key = (data[i] >> 4) * 256 + (data[i + 1] >> 4) * 16 + (data[i + 2] >> 4);
            const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
            b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2];
            buckets.set(key, b);
          }
        }
        if (solid < edge * 0.6) return done("");
        let top = null;
        for (const b of buckets.values()) if (!top || b.n > top.n) top = b;
        done(`rgb(${Math.round(top.r / top.n)}, ${Math.round(top.g / top.n)}, ${Math.round(top.b / top.n)})`);
      } catch {
        done("");
      }
    };
    img.src = src;
  });
}

async function tint(frame) {
  const img = frame.querySelector("img");
  const src = img?.currentSrc || img?.src || "";
  if (frame.dataset.tintSrc === src) return;
  frame.dataset.tintSrc = src;
  const colour = src ? await edgeColour(src) : "";
  if (frame.dataset.tintSrc !== src) return; // the logo changed while reading
  frame.style.setProperty("--logo-bg", colour || "");
  frame.classList.toggle("has-logo-bg", Boolean(colour));
}

/** Gives each round logo frame the logo's edge colour, and keeps it current as logos change. */
export default function LogoTint() {
  useEffect(() => {
    let queued = false;
    const run = () => {
      queued = false;
      document.querySelectorAll(FRAMES).forEach(tint);
    };
    const later = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    run();
    const watch = new MutationObserver(later);
    watch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => watch.disconnect();
  }, []);
  return null;
}
