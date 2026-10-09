"use client";

import { useEffect, useState } from "react";
import { motionDurations, shouldShowIntro } from "../lib/brandMotion.mjs";

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

export default function BrandTransition({ interactionId, onInteractionComplete }) {
  const [visible, setVisible] = useState(true);
  const [mode, setMode] = useState("intro");

  useEffect(() => {
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
  }, []);

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
      aria-hidden="true"
    >
      <AnimatedLogo />
    </div>
  );
}
