"use client";

/** Prints the transparency report (the admin menu and these buttons are left off the page). */
export default function PrintButton() {
  return <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => window.print()}>Print</button>;
}
