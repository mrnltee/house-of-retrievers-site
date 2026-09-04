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

    const timer = window.setTimeout(
      () => setVisible(false),
      reducedMotion ? motionDurations.reduced : motionDurations.intro,
    );

    return () => window.clearTimeout(timer);
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
