"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Opens a page's receipt and vaccination-card links in a modal instead of a new tab.
 * Any link with data-lightbox="Caption" opens here; Esc, the × button or a click
 * outside the picture closes it, and "Open in new tab" stays available.
 */
export default function ImageLightbox() {
  const dialog = useRef(null);
  const [shown, setShown] = useState(null);

  useEffect(() => {
    const onClick = (event) => {
      const link = event.target.closest?.("a[data-lightbox]");
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      setShown({ src: link.href, caption: link.dataset.lightbox });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (shown && !dialog.current?.open) dialog.current?.showModal();
  }, [shown]);

  return (
    <dialog ref={dialog} className="lightbox" aria-label={shown?.caption || "Picture"} onClose={() => setShown(null)} onClick={(e) => { if (e.target === e.currentTarget) dialog.current.close(); }}>
      {shown && (
        <figure>
          <div className="lightbox-bar">
            <figcaption>{shown.caption}</figcaption>
            <a className="btn ghost small" href={shown.src} target="_blank" rel="noreferrer">Open in new tab</a>
            <button type="button" className="lightbox-close" onClick={() => dialog.current.close()} aria-label="Close" autoFocus>×</button>
          </div>
          <img src={shown.src} alt={shown.caption} />
        </figure>
      )}
    </dialog>
  );
}
