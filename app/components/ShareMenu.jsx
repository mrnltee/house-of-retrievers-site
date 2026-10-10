"use client";

import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";
import { eventUrl, shareCaption, shareLine, shareLinks } from "../lib/share.mjs";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * "Share" for one event. On phones the system share sheet comes first (it
 * reaches Instagram, Messenger and Viber directly); every device also gets
 * Facebook, X and Threads links, a caption to paste into Instagram, and the link.
 * `inline` shows the options without the toggle (used in the admin);
 * `compact` makes the toggle an icon button with a hidden label.
 */
export default function ShareMenu({ event, inline = false, compact = false, className = "" }) {
  const [open, setOpen] = useState(inline);
  const [note, setNote] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const wrapRef = useRef(null);
  const listId = useId();

  useEffect(() => setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  useEffect(() => {
    if (!open || inline) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClick = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onClick);
    };
  }, [open, inline]);

  const url = eventUrl(event.slug);

  async function nativeShare() {
    try {
      await navigator.share({ title: event.title, text: shareLine(event), url });
    } catch {
      // Closing the share sheet is not an error worth showing.
    }
  }

  async function copy(kind) {
    const ok = await copyText(kind === "caption" ? shareCaption(event) : url);
    setNote(ok ? (kind === "caption" ? "Caption copied. Paste it into your Instagram post or story." : "Link copied.") : "Couldn't copy. Press and hold to copy instead.");
  }

  return (
    <div className={`share ${inline ? "share-inline" : ""} ${className}`} ref={wrapRef}>
      {!inline && (
        <button type="button" className={`share-toggle${compact ? " is-compact" : ""}`} aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)}>
          <Icon name="share" size={compact ? 18 : 16} /> <span className={compact ? "visually-hidden" : undefined}>Share{compact ? ` ${event.title}` : ""}</span>
        </button>
      )}
      {open && (
        <div className="share-panel" id={listId}>
          <ul className="share-options">
            {canNativeShare && (
              <li><button type="button" onClick={nativeShare}>Share from this phone…</button></li>
            )}
            {shareLinks(event).map((link) => (
              <li key={link.id}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
              </li>
            ))}
            <li><button type="button" onClick={() => copy("caption")}>Instagram: copy caption</button></li>
            <li><button type="button" onClick={() => copy("link")}>Copy link</button></li>
          </ul>
          <p className="share-note" role="status">{note}</p>
        </div>
      )}
    </div>
  );
}
