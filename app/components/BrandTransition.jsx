"use client";

import { useEffect, useState } from "react";
import { motionDurations, shouldShowIntro } from "../lib/brandMotion.mjs";
import { useSeasonalTheme } from "./SeasonalTheme";

function AnimatedLogo() {
  return (
    <div className="brand-transition-mark">
      <img className="brand-transition-layer" src="/house-of-retrievers-logo-reverse.png" alt="" />

      <span className="brand-transition-cover brand-transition-cover-gold" />
      <span className="brand-transition-head brand-transition-head-gold">
        <img className="brand-transition-layer" src="/house-of-retrievers-logo-reverse.png" alt="" />
      </span>

      <span className="brand-transition-cover brand-transition-cover-companion" />
      <span className="brand-transition-head brand-transition-head-companion">
        <img className="brand-transition-layer" src="/house-of-retrievers-logo-reverse.png" alt="" />
      </span>
    </div>
  );
}

function HalloweenScene() {
  const bat = (
    <svg viewBox="0 0 80 34" aria-hidden="true" focusable="false">
      <path d="M40 18c-6-8-13-12-22-13 2 4 2 8 0 12-5-2-11-2-17 1 6 3 10 7 13 12 4-3 8-4 13-3 19 4 5 7 9 8 13-4-2-4-2-8 0-12-9 1-16 5-22 13-1-2-5-1-9-1-12 6 2 11 2 17-1-2-4-2-8 0-12-9 1-16 5-22 13-5 1-9 5-13 8Z" />
    </svg>
  );

  return (
    <div className="seasonal-halloween" aria-hidden="true">
      <span className="halloween-bat halloween-bat-one">{bat}</span>
      <span className="halloween-bat halloween-bat-two">{bat}</span>
      <svg className="halloween-pumpkin" viewBox="0 0 80 76" aria-hidden="true" focusable="false">
        <path className="pumpkin-stem" d="M37 14c0-7 4-12 11-14 1 5-1 10-7 15Z" />
        <path className="pumpkin-body" d="M40 13c7-7 17-5 22 2 10 0 18 10 18 24 0 20-16 35-40 35S0 59 0 39c0-14 8-24 18-24 5-7 15-9 22-2Z" />
        <path className="pumpkin-rib" d="M25 17c-8 11-8 38 1 51M55 17c8 11 8 38-1 51M40 14v58" />
      </svg>
    </div>
  );
}

export default function BrandTransition({ interactionId, onInteractionComplete }) {
  const { theme, ready: themeReady } = useSeasonalTheme();
  const [visible, setVisible] = useState(true);
  const [mode, setMode] = useState("intro");

  useEffect(() => {
    if (!themeReady) return undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!shouldShowIntro()) {
      setVisible(false);
      return undefined;
    }

    // A visitor who taps, clicks, presses a key or scrolls is ready for the
    // page: end the intro rather than make them wait it out. The listeners go
    // away with the intro so they can never cut short a later Join transition.
    const skipEvents = ["pointerdown", "keydown", "wheel", "touchmove"];
    let timer;
    const end = () => {
      window.clearTimeout(timer);
      skipEvents.forEach((type) => window.removeEventListener(type, end));
      setVisible(false);
    };
    timer = window.setTimeout(end, reducedMotion ? motionDurations.reduced : motionDurations.intro);
    skipEvents.forEach((type) => window.addEventListener(type, end, { passive: true }));

    return () => {
      window.clearTimeout(timer);
      skipEvents.forEach((type) => window.removeEventListener(type, end));
    };
  }, [themeReady]);

  useEffect(() => {
    if (!interactionId) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode("interaction");
    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
      onInteractionComplete();
    }, reducedMotion ? motionDurations.reduced : motionDurations.interaction);

    return () => window.clearTimeout(timer);
  }, [interactionId, onInteractionComplete]);

  useEffect(() => {
    if (!visible) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      key={`${mode}-${interactionId}`}
      className={`brand-transition brand-transition-${mode}`}
      data-seasonal-theme={theme?.splashVariant || "default"}
      data-seasonal-welcome={theme?.welcomeText || ""}
      aria-hidden="true"
    >
      {themeReady && mode === "intro" && theme?.splashVariant === "halloween" && <HalloweenScene />}
      {themeReady && <AnimatedLogo />}
      {themeReady && theme?.welcomeText && <p className="brand-transition-welcome">{theme.welcomeText}</p>}
    </div>
  );
}
