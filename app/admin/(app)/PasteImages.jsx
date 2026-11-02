"use client";

import { useEffect, useRef, useState } from "react";

const IMAGE_INPUT = 'input[type="file"]';
export const takesImages = (input) => input && !input.disabled && /image/.test(input.accept || "image/");
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

/** The box an image upload sits in: its field, or the element around the upload button. */
function zoneOf(input) {
  return input.closest(".logo-field") || input.closest(".field") || input.closest("label")?.parentElement || input.parentElement;
}

/** Puts the chosen images into an upload, as if they'd been picked. Returns how many. */
export function fill(input, files) {
  const usable = files.filter((f) => accepts(input, f));
  if (!usable.length) return 0;
  const dt = new DataTransfer();
  (input.multiple ? usable : usable.slice(0, 1)).forEach((f, i) => dt.items.add(new File([f], f.name && f.name !== "image.png" ? f.name : `pasted-${Date.now()}-${i}.${(f.type.split("/")[1] || "png").replace("jpeg", "jpg")}`, { type: f.type })));
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return dt.files.length;
}

/**
 * Paste or drop an image straight into an image upload (owner, 2026-11-03): each
 * upload's box shows "Click here to paste an image" on hover; once clicked it says
 * "Now press ⌘V". Dragging a file onto the box works too. On a page with a single
 * image upload, pasting anywhere works. The field then behaves exactly as if the
 * file had been picked, preview and size checks included.
 */
export default function PasteImages() {
  const last = useRef(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const key = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘V" : "Ctrl+V";
    // Mark every image upload's box: hovering says "Click here to paste", a clicked box says "Now press ⌘V".
    const mark = () => {
      for (const input of document.querySelectorAll(IMAGE_INPUT)) {
        if (!takesImages(input)) continue;
        const zone = zoneOf(input);
        if (zone && !zone.classList.contains("paste-zone")) { zone.classList.add("paste-zone"); zone.dataset.pasteKey = key; }
      }
    };
    mark();
    let queued = 0;
    const observer = new MutationObserver(() => { cancelAnimationFrame(queued); queued = requestAnimationFrame(mark); });
    observer.observe(document.body, { childList: true, subtree: true });

    const ready = (input) => {
      last.current = input;
      document.querySelectorAll(".paste-ready").forEach((z) => z.classList.remove("paste-ready"));
      zoneOf(input)?.classList.add("paste-ready");
    };
    const remember = (event) => {
      const input = inputNear(event.target);
      if (input) ready(input);
      else if (!event.target.closest?.(".paste-zone")) document.querySelectorAll(".paste-ready").forEach((z) => z.classList.remove("paste-ready"));
    };
    const paste = (event) => {
      const files = [...(event.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      const active = document.activeElement;
      const typing = active && (active.isContentEditable || active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && !/^(file|checkbox|radio|button|submit)$/.test(active.type)));
      if (typing && event.clipboardData.types.includes("text/plain")) return; // pasting text into a box
      const all = [...document.querySelectorAll(IMAGE_INPUT)].filter(takesImages);
      const input = (last.current && document.contains(last.current) && takesImages(last.current) ? last.current : null) || (all.length === 1 ? all[0] : null);
      if (!input) {
        if (all.length) setNote("Click the image box you want first, then paste.");
        return;
      }
      event.preventDefault();
      const n = fill(input, files);
      setNote(n ? `Image pasted${n > 1 ? ` (${n})` : ""}. Remember to save.` : "That image type isn't accepted here. Use PNG, JPG or WebP.");
    };
    // Drag a file onto an image box to upload it.
    const over = (event) => {
      const zone = event.target.closest?.(".paste-zone");
      document.querySelectorAll(".paste-drop").forEach((z) => z !== zone && z.classList.remove("paste-drop"));
      if (!zone || !event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      zone.classList.add("paste-drop");
    };
    const drop = (event) => {
      const zone = event.target.closest?.(".paste-zone");
      document.querySelectorAll(".paste-drop").forEach((z) => z.classList.remove("paste-drop"));
      const input = zone && [...zone.querySelectorAll(IMAGE_INPUT)].find(takesImages);
      if (!input) return;
      event.preventDefault();
      const n = fill(input, [...(event.dataTransfer?.files || [])].filter((f) => f.type.startsWith("image/")));
      ready(input);
      setNote(n ? `Image added${n > 1 ? ` (${n})` : ""}. Remember to save.` : "Drop a PNG, JPG or WebP image.");
    };
    document.addEventListener("pointerdown", remember, true);
    document.addEventListener("focusin", remember, true);
    document.addEventListener("paste", paste);
    document.addEventListener("dragover", over);
    document.addEventListener("drop", drop);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", remember, true);
      document.removeEventListener("focusin", remember, true);
      document.removeEventListener("paste", paste);
      document.removeEventListener("dragover", over);
      document.removeEventListener("drop", drop);
    };
  }, []);

  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(""), 2600);
    return () => clearTimeout(timer);
  }, [note]);

  return <div className={`paste-toast${note ? " is-on" : ""}`} role="status" aria-live="polite">{note}</div>;
}
