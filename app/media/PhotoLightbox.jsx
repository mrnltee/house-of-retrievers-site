"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Opens media-hub photos in a modal viewer instead of a new page.
 * Any link marked `data-lightbox="<group>"` opens it; the photos of that group
 * (one event album) can be stepped through with the buttons, ← → keys or a swipe.
 * The links keep their href, so without JavaScript they still open the photo.
 */
export default function PhotoLightbox() {
  const dialog = useRef(null);
  const touch = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const onClick = (e) => {
      const link = e.target.closest?.("a[data-lightbox]");
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const group = [...document.querySelectorAll("a[data-lightbox]")].filter((a) => a.dataset.lightbox === link.dataset.lightbox);
      setPhotos(group.map((a) => ({ src: a.href, alt: a.querySelector("img")?.alt || "", caption: a.dataset.caption || "", album: a.dataset.album || "" })));
      setIndex(Math.max(0, group.indexOf(link)));
      dialog.current?.showModal();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const step = (d) => setIndex((i) => (i + d + photos.length) % photos.length);
  const photo = photos[index];

  return (
    <dialog
      ref={dialog}
      className="event-lightbox media-lightbox"
      aria-label={photo?.album ? `${photo.album} photos` : "Photos"}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
      onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touch.current ?? 0);
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      }}
    >
      {photo && (
        <figure className="media-lightbox-figure">
          <img src={photo.src} alt={photo.alt} />
          <figcaption>
            {photo.album ? <strong>{photo.album}</strong> : null}
            {photo.caption ? <span>{photo.caption}</span> : null}
          </figcaption>
        </figure>
      )}
      <p className="event-lightbox-count" aria-live="polite">{photos.length ? `${index + 1} / ${photos.length}` : ""}</p>
      {photos.length > 1 && (
        <>
          <button type="button" className="event-lightbox-prev" onClick={() => step(-1)} aria-label="Previous photo">‹</button>
          <button type="button" className="event-lightbox-next" onClick={() => step(1)} aria-label="Next photo">›</button>
        </>
      )}
      <button type="button" className="event-lightbox-close" onClick={() => dialog.current.close()} aria-label="Close photos">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </dialog>
  );
}
