"use client";

import { useLayoutEffect, useRef } from "react";
import { FORMATS, applyFormat } from "../../../../lib/letterFormat.mjs";

/**
 * Formatting buttons over a letter textarea: they write the letter's own
 * marks at the selection, so the text box stays the source and the preview
 * shows the result. Ctrl/⌘+B is bold.
 */
export default function FormatBar({ target, keys, value, onChange, label, children }) {
  // The new selection is set once React has drawn the new text (earlier, it lands at the end).
  const pending = useRef(null);
  useLayoutEffect(() => {
    const el = target.current;
    if (!el || !pending.current) return;
    el.focus();
    el.setSelectionRange(pending.current.start, pending.current.end);
    pending.current = null;
  }, [value, target]);
  const run = (key) => {
    const el = target.current;
    if (!el) return;
    const next = applyFormat(key, value, el.selectionStart, el.selectionEnd);
    pending.current = next;
    onChange(next.text);
  };
  // "|" in keys draws a divider between groups; `children` is the textarea, drawn under the bar.
  return (
    <div className="letter-format">
    <div className="letter-format-bar" role="toolbar" aria-label={label}>
      {keys.map((key, i) => key === "|" ? <span key={`sep${i}`} className="letter-format-sep" aria-hidden="true" /> : (
        <button key={key} type="button" className={`letter-format-btn fmt-${key}`} title={FORMATS[key].title} aria-label={FORMATS[key].title} data-confirm="not-needed-read-only" onMouseDown={(e) => e.preventDefault()} onClick={() => run(key)}>
          {FORMATS[key].label}
        </button>
      ))}
    </div>
    {children}
    </div>
  );
}

/** Ctrl/⌘+B in a letter textarea: clicks the bar's Bold, so the selection is kept the same way. */
export const boldKey = (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "b") return;
  e.preventDefault();
  e.currentTarget.closest(".letter-format")?.querySelector(".fmt-bold")?.click();
};
