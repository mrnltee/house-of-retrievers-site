"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Gentle smoothing for mouse-wheel scrolling on the public site (owner,
 * 2026-10-28): steps from a wheel glide instead of jumping, which is easier
 * on the eyes. Kept light (no floaty overshoot), never on touch screens (they
 * already scroll smoothly), never for visitors who ask for reduced motion,
 * and never in the admin. The page still scrolls natively underneath, so
 * sticky sections, anchors and the browser's own find and keys keep working.
 */
export default function SmoothScroll() {
  const pathname = usePathname();
  useEffect(() => {
    const admin = window.location.hostname.startsWith("admin.") || pathname.startsWith("/admin");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (admin || calm.matches) return undefined;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.14,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
      allowNestedScroll: true,
    });
    const stop = () => { if (calm.matches) lenis.destroy(); };
    calm.addEventListener("change", stop);
    return () => {
      calm.removeEventListener("change", stop);
      lenis.destroy();
    };
  }, [pathname]);
  return null;
}
