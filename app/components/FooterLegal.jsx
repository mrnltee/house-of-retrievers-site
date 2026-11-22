"use client";

import useLegal from "../lib/useLegal";
import { MEDIA_URL, PRIVACY_URL } from "../lib/siteSeo.mjs";
import { EVENTS_URL } from "../lib/eventsHost.mjs";

/**
 * The society's name and SEC registration are part of the unveiling. They
 * come from /api/legal (via useLegal), which releases them only from launch,
 * so they are not in the page source before then. The copyright line always
 * shows.
 */
export default function FooterLegal() {
  const legal = useLegal();

  return (
    <div className="footer-legal">
      {legal && (
        <>
          <p className="footer-org">{legal.org}</p>
          <p>SEC Registration No. {legal.sec}</p>
        </>
      )}
      <nav className="footer-links" aria-label="More from House of Retrievers">
        <a className="footer-privacy" href={EVENTS_URL}>Events</a>
        <span className="footer-links-dot" aria-hidden="true">·</span>
        <a className="footer-privacy" href={PRIVACY_URL}>Privacy notice</a>
        <span className="footer-links-dot" aria-hidden="true">·</span>
        <a className="footer-privacy" href={MEDIA_URL}>Media kit</a>
      </nav>
      <p suppressHydrationWarning>© {new Date().getFullYear()} All rights reserved.</p>
    </div>
  );
}
