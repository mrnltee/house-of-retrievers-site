"use client";

import { useRef, useState } from "react";
import { encodeJpegWithin, loadBitmap } from "../../../lib/resizeImage";
import { MAX_GALLERY } from "../../../lib/admin/events.mjs";
import { describePhoto, uploadEventPhoto } from "../../eventTools";

/** Longest side kept. The event page shows these whole, at most about 900 px wide. */
const EDGE = 1600;
const MAX_BYTES = 600 * 1024;

async function shrink(file) {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return encodeJpegWithin(canvas, MAX_BYTES);
}

/**
 * Up to three more pictures beside the cover (four in all): the full poster,
 * the venue, last year's crowd. Each is shown whole on the event page, never
 * cropped. A picked photo is shrunk here and stored straight away, so saving
 * the event never has to carry several photos at once.
 */
export default function EventGallery({ initial = [], autoDescribe = false }) {
  const [items, setItems] = useState(initial.map((item, i) => ({ ...item, key: `saved-${i}` })));
  const [busy, setBusy] = useState(0);
  const [message, setMessage] = useState("");
  const input = useRef(null);
  const room = MAX_GALLERY - items.length - busy;

  const update = (key, patch) => setItems((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  async function add(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith("image/"));
    if (input.current) input.current.value = "";
    if (!files.length) return;
    const take = files.slice(0, Math.max(0, room));
    setMessage(take.length < files.length ? `Only ${MAX_GALLERY + 1} photos per event, cover included, so ${files.length - take.length} ${files.length - take.length === 1 ? "wasn't" : "weren't"} added.` : "");
    const title = input.current?.form?.elements?.title?.value || "";
    for (const file of take) {
      setBusy((n) => n + 1);
      try {
        const { dataUrl } = await shrink(file);
        const saved = await uploadEventPhoto(dataUrl);
        if (saved.error) throw new Error(saved.error);
        const key = saved.src;
        setItems((list) => [...list, { key, src: saved.src, alt: "", describing: autoDescribe }]);
        if (autoDescribe) {
          describePhoto(dataUrl, title)
            .then((result) => {
              // Never replace something typed while the suggestion was on its way.
              setItems((list) => list.map((item) => (item.key === key ? { ...item, describing: false, alt: item.alt || result.alt || "", suggested: Boolean(!item.alt && result.alt) } : item)));
            })
            .catch(() => update(key, { describing: false }));
        }
      } catch (error) {
        setMessage(error.message || "That photo couldn't be added.");
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }

  function move(index, by) {
    setItems((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });
  }

  return (
    <div className="form" style={{ gap: 10 }}>
      <span className="field">
        <span>More photos <small>Optional, up to {MAX_GALLERY}. The full poster, the venue, a past edition. Shown whole on the event page after the cover.</small></span>
      </span>
      <ul className="gallery-edit">
        {items.map((item, i) => (
          <li key={item.key}>
            <div className="gallery-thumb">
              <img src={item.src} alt="" />
              <button type="button" className="gallery-remove" onClick={() => setItems(items.filter((x) => x.key !== item.key))} aria-label={`Remove photo ${i + 2}`}>×</button>
            </div>
            <label className="field">
              <span className="visually-hidden">Description of photo {i + 2}</span>
              <textarea
                rows={2}
                maxLength={200}
                value={item.alt}
                placeholder={item.describing ? "Looking at the photo…" : "What's in the photo (optional)"}
                aria-busy={item.describing}
                onChange={(e) => update(item.key, { alt: e.target.value, suggested: false })}
              />
            </label>
            {item.suggested && <p className="small muted">Suggested from the photo. Edit anything that's off.</p>}
            {items.length > 1 && (
              <div className="gallery-order">
                <button type="button" className="linkish" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move photo ${i + 2} earlier`}>←</button>
                <button type="button" className="linkish" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move photo ${i + 2} later`}>→</button>
              </div>
            )}
          </li>
        ))}
        {Array.from({ length: busy }, (_, i) => <li key={`busy-${i}`} className="gallery-busy" aria-hidden="true"><div className="gallery-thumb"><span>Adding…</span></div></li>)}
        {room > 0 && (
          <li>
            <label className="gallery-add">
              <input ref={input} type="file" accept="image/*" multiple className="visually-hidden" onChange={(e) => add(e.target.files)} />
              <span aria-hidden="true">+</span>
              <span>Add {items.length ? "another" : "a photo"}</span>
              <small>{room} of {MAX_GALLERY} left</small>
            </label>
          </li>
        )}
      </ul>
      {message && <p className="small" role="status">{message}</p>}
      <input type="hidden" name="gallery" value={JSON.stringify(items.map(({ src, alt }) => ({ src, alt })))} />
    </div>
  );
}
