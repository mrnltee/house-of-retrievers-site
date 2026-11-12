"use client";

import { useState } from "react";

/** Copies a boilerplate to the clipboard and says so. */
export default function CopyButton({ text, label = "Copy" }) {
  const [state, setState] = useState("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2400);
  };
  return (
    <button type="button" className="media-copy-button" onClick={copy}>
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Select and copy the text" : label}</span>
    </button>
  );
}
