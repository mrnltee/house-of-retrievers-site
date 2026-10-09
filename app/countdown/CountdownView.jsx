"use client";

import { useEffect, useRef, useState } from "react";
import { QUOTES, quoteAt } from "./quotes.mjs";
import { SITE_URL, SOCIAL_PROFILES } from "../lib/siteSeo.mjs";

const UNITS = [
  ["days", "Days", 86400000],
  ["hours", "Hours", 3600000],
  ["minutes", "Minutes", 60000],
  ["seconds", "Seconds", 1000],
];

function split(ms) {
  let rest = Math.max(0, ms);
  const out = {};
  for (const [key, , size] of UNITS) {
    out[key] = Math.floor(rest / size);
    rest -= out[key] * size;
  }
  return out;
}

const pad = (n) => String(n).padStart(2, "0");
const THEME_KEY = "hor-countdown-theme";

function readTheme() {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Countdown to the opening. Times come from the server's clock (the offset
 * is measured once), so a visitor whose phone clock is wrong still sees the
 * right numbers. The quote follows the shared schedule in quotes.mjs.
 */
export default function CountdownView({ launchAt, serverNow, initialQuote, initialChangesAt }) {
  const offset = useRef(0);
  const [now, setNow] = useState(serverNow);
  const [quote, setQuote] = useState({ index: initialQuote, changesAt: initialChangesAt });
  const [fading, setFading] = useState(false);
  const [theme, setTheme] = useState(null);
  const [systemDark, setSystemDark] = useState(true);

  // Clock: correct for the visitor's clock, then tick each second.
  useEffect(() => {
    offset.current = serverNow - Date.now();
    const tick = () => setNow(Date.now() + offset.current);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [serverNow]);

  // Theme: the system's, unless the visitor picked one here.
  useEffect(() => {
    setTheme(readTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const onChange = (e) => setSystemDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Quote: swap when its slot ends.
  useEffect(() => {
    const wait = Math.max(1000, quote.changesAt - (Date.now() + offset.current));
    const id = window.setTimeout(() => {
      const next = quoteAt(Date.now() + offset.current);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return setQuote({ index: next.index, changesAt: next.changesAt });
      setFading(true);
      window.setTimeout(() => {
        setQuote({ index: next.index, changesAt: next.changesAt });
        setFading(false);
      }, 600);
    }, wait);
    return () => window.clearTimeout(id);
  }, [quote.changesAt]);

  const left = launchAt - now;
  const open = left <= 0;

  // Open: go to the site after a short pause.
  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => window.location.assign(`${SITE_URL}/`), 4000);
    return () => window.clearTimeout(id);
  }, [open]);

  const parts = split(left);
  const units = UNITS.filter(([key]) => key !== "days" || parts.days > 0);
  const dark = theme ? theme === "dark" : systemDark;
  const current = QUOTES[quote.index] || QUOTES[0];

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private windows may refuse storage; the choice lasts for this visit.
    }
  }

  const spoken = open
    ? "We're open."
    : `${parts.days ? `${parts.days} days, ` : ""}${parts.hours} hours and ${parts.minutes} minutes to go.`;

  return (
    <main className="cd" data-theme={theme || undefined}>
      <button type="button" className="cd-theme" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
        <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
      </button>

      <div className="cd-inner">
        <span className="cd-logo">
          <img className="cd-logo-dark" src="/house-of-retrievers-logo-reverse.png" alt="House of Retrievers — Paws for a Purpose" width="1396" height="564" />
          <img className="cd-logo-light" src="/house-of-retrievers-logo-original.png" alt="" width="1396" height="564" />
        </span>

        {open ? (
          <>
            <p className="cd-eyebrow">It's time</p>
            <h1>We're open.</h1>
            <a className="cd-enter" href={`${SITE_URL}/`}>Come on in <span aria-hidden="true">→</span></a>
          </>
        ) : (
          <>
            <p className="cd-eyebrow">Almost time</p>
            <h1>Something good is <em>on its way.</em></h1>

            <div className="cd-timer" role="timer" aria-hidden="true">
              {units.map(([key, label], i) => (
                <div className="cd-unit-wrap" key={key}>
                  {i > 0 && <span className="cd-sep">:</span>}
                  <div className="cd-unit">
                    <span className="cd-num" suppressHydrationWarning>{key === "days" ? parts[key] : pad(parts[key])}</span>
                    <span className="cd-label">{label}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="visually-hidden" aria-live="polite">{spoken}</p>

            <p className="cd-when">
              Saturday, 10 October · 5:00 PM <span>Manila time</span>
            </p>
          </>
        )}

        <figure className={`cd-quote ${fading ? "is-fading" : ""}`}>
          <blockquote>
            <p>{current.text}</p>
          </blockquote>
          <figcaption>{current.by}</figcaption>
        </figure>

        <nav className="cd-social" aria-label="Follow House of Retrievers">
          <span>Follow along while you wait</span>
          <div>
            {SOCIAL_PROFILES.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">{url.includes("instagram") ? "Instagram" : "Facebook"}</a>
            ))}
          </div>
        </nav>
      </div>

      <div className="cd-footer" role="contentinfo">
        <p className="cd-org">The House of Retrievers Society Inc.</p>
        <p>SEC Registration No. 2026090268846-06</p>
      </div>
    </main>
  );
}
