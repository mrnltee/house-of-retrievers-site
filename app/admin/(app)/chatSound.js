"use client";

/**
 * The team chat's soft chime (owner, 23 Nov 2026): two short sine notes made with Web Audio, so there's no
 * sound file to load. Browsers only allow sound after the person has clicked or typed on the page, so the
 * audio is unlocked on the first press; until then a new message stays silent (the badge still shows).
 * The mute choice is kept per browser under `hor-chat-sound`.
 */
const KEY = "hor-chat-sound";
export const SOUND_EVENT = "hor-chat-sound";

let ctx = null;

function context() {
  if (ctx) return ctx;
  const Audio = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!Audio) return null;
  try { ctx = new Audio(); } catch { ctx = null; }
  return ctx;
}

/** Call once on the page: the first click, tap or key press unlocks sound for the rest of the visit. */
export function unlockOnFirstPress() {
  const unlock = () => {
    const c = context();
    if (c && c.state === "suspended") c.resume().catch(() => {});
    if (!c || c.state === "running") {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    }
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  return () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
}

export function isMuted() {
  try { return localStorage.getItem(KEY) === "off"; } catch { return false; }
}

export function setMuted(muted) {
  try {
    if (muted) localStorage.setItem(KEY, "off");
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode: the choice lasts until the page reloads.
  }
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: { muted } }));
}

/** Plays the chime if sound is unlocked. Quiet on purpose: about a fifth of full volume, under half a second. */
export function chime() {
  const c = ctx;
  if (!c || c.state !== "running") return false;
  const now = c.currentTime;
  [[784, 0], [1174.66, 0.11]].forEach(([freq, at]) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.32);
    osc.connect(gain).connect(c.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.34);
  });
  return true;
}
