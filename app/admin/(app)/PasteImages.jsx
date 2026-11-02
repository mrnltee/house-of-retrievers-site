"use client";

import { useEffect, useRef, useState } from "react";

const IMAGE_INPUT = 'input[type="file"]';
const takesImages = (input) => input && !input.disabled && /image/.test(input.accept || "image/");
const accepts = (input, file) => {
  const list = String(input.accept || "").split(",").map((t) => t.trim()).filter(Boolean);
  return !list.length || list.some((t) => t === file.type || (t.endsWith("/*") && file.type.startsWith(t.slice(0, -1))));
};

/** The image upload nearest to an element: the field it sits in, walking up a few levels. */
function inputNear(el) {
  for (let node = el, depth = 0; node && node !== document.body && depth < 8; node = node.parentElement, depth++) {
    const found = [...node.querySelectorAll?.(IMAGE_INPUT) || []].filter(takesImages);
    if (found.length === 1) return found[0];
    if (found.length > 1) return null;
    if (node.matches?.(".card, main")) return null;
  }
  return null;
}

/**
 * Paste an image straight into an image upload (owner, 2026-11-03): copy an image
 * or screenshot, click the field (or anywhere near it), and press ⌘V / Ctrl+V. On a
 * page with a single image upload, pasting anywhere works. The field then behaves
 * exactly as if the file had been picked, preview and size checks included.
 */
export default function PasteImages() {
  const last = useRef(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const remember = (event) => {
      const input = inputNear(event.target);
      if (input) last.current = input;
    };
    const paste = (event) => {
      const files = [...(event.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      const active = document.activeElement;
      const typing = active && (active.isContentEditable || /^(TEXTAREA)$/.test(active.tagName) || (active.tagName === "INPUT" && !/^(file|checkbox|radio|button|submit)$/.test(active.type)));
      if (typing && event.clipboardData.types.includes("text/plain")) return; // pasting text into a box
      const all = [...document.querySelectorAll(IMAGE_INPUT)].filter(takesImages);
      const input = (last.current && document.contains(last.current) && takesImages(last.current) ? last.current : null) || (all.length === 1 ? all[0] : null);
      if (!input) {
        if (all.length) setNote("Click the image field first, then paste.");
        return;
      }
      const usable = files.filter((f) => accepts(input, f));
      if (!usable.length) { setNote("That image type isn't accepted here. Use PNG, JPG or WebP."); event.preventDefault(); return; }
      event.preventDefault();
      const dt = new DataTransfer();
      (input.multiple ? usable : usable.slice(0, 1)).forEach((f, i) => dt.items.add(new File([f], f.name && f.name !== "image.png" ? f.name : `pasted-${Date.now()}-${i}.${(f.type.split("/")[1] || "png").replace("jpeg", "jpg")}`, { type: f.type })));
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      setNote(`Image pasted${dt.files.length > 1 ? ` (${dt.files.length})` : ""}.`);
    };
    document.addEventListener("pointerdown", remember, true);
    document.addEventListener("focusin", remember, true);
    document.addEventListener("paste", paste);
    return () => {
      document.removeEventListener("pointerdown", remember, true);
      document.removeEventListener("focusin", remember, true);
      document.removeEventListener("paste", paste);
    };
  }, []);

  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(""), 2600);
    return () => clearTimeout(timer);
  }, [note]);

  return <div className={`paste-toast${note ? " is-on" : ""}`} role="status" aria-live="polite">{note}</div>;
}
