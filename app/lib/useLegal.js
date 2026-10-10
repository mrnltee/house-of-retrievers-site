"use client";

import { useEffect, useState } from "react";

/**
 * The society's registered name and SEC number, or null until /api/legal
 * releases them (from launch in production, straight away on previews).
 * If the page is open at release time it asks again then, so they appear
 * without a reload. Used by FooterLegal and the Journey timeline.
 *
 * @returns {{ org: string, sec: string } | null}
 */
export default function useLegal() {
  const [legal, setLegal] = useState(null);

  useEffect(() => {
    let timer;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await (await fetch("/api/legal", { cache: "no-store" })).json();
        if (cancelled) return;
        if (data.org) return setLegal(data);
        // Not yet: ask again at release time (plus a moment for clock drift).
        const wait = Math.min(Math.max(data.releaseAt - Date.now(), 0) + 3000, 2 ** 31 - 1);
        timer = window.setTimeout(load, wait);
      } catch {
        // Offline or blocked: callers show their pre-launch version.
      }
    };
    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return legal;
}
