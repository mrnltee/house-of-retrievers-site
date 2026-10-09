"use client";

import { useEffect, useState } from "react";

/**
 * The society's name and SEC registration are part of the unveiling. They
 * come from /api/legal, which releases them only from launch, so they are
 * not in the page source before then. The copyright line always shows.
 */
export default function FooterLegal() {
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
        // Offline or blocked: the footer simply shows the copyright line.
      }
    };
    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="footer-legal">
      {legal && (
        <>
          <p className="footer-org">{legal.org}</p>
          <p>SEC Registration No. {legal.sec}</p>
        </>
      )}
      <p suppressHydrationWarning>© {new Date().getFullYear()} All rights reserved.</p>
    </div>
  );
}
