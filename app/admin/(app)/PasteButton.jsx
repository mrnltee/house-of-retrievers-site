"use client";

import { useState } from "react";
import { fill, takesImages } from "./PasteImages";

/**
 * "Paste image" beside an upload button (owner, 2026-11-03): puts the image you
 * copied (a screenshot, "Copy image" in the browser…) into the upload next to it.
 * The browser may ask once to allow reading the clipboard.
 */
export default function PasteButton() {
  const [note, setNote] = useState("");
  async function paste(event) {
    const input = [...(event.currentTarget.parentElement?.querySelectorAll('input[type="file"]') || [])].find(takesImages);
    if (!input) return;
    try {
      const files = [];
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) files.push(new File([await item.getType(type)], `pasted-${Date.now()}.${type.split("/")[1].replace("jpeg", "jpg")}`, { type }));
      }
      if (!files.length) return setNote("No image copied yet. Copy an image or take a screenshot first.");
      setNote(fill(input, files) ? "Pasted. Remember to save." : "That image type isn't accepted here. Use PNG, JPG or WebP.");
    } catch {
      setNote("Your browser didn't allow it. Click the image box and press ⌘V (Ctrl+V) instead.");
    }
  }
  return (
    <>
      <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={paste}>Paste image</button>
      {note && <span className="small muted" role="status">{note}</span>}
    </>
  );
}
