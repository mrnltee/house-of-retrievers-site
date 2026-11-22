"use client";

import { useState } from "react";

/**
 * Copies a payment number. `value` is what goes on the clipboard (the full
 * number, even when the screen shows it partly hidden); spaces are dropped so
 * banking apps accept the paste.
 */
export default function CopyButton({ value, label, text = "Copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value).replace(/\s+/g, ""));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard blocked: the number is on screen to type */ }
      }}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
    >
      {copied ? "Copied" : text}
    </button>
  );
}
