"use client";

import useLegal from "../lib/useLegal";

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
      <p suppressHydrationWarning>© {new Date().getFullYear()} All rights reserved.</p>
    </div>
  );
}
