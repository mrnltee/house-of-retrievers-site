"use client";

import { useState } from "react";

/** Shrinks a picked picture in the browser, keeping transparency (WebP, else PNG). */
async function shrink(file, maxEdge, format) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (format === "png") return canvas.toDataURL("image/png");
  const webp = canvas.toDataURL("image/webp", 0.88);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

/**
 * A photo or logo picker with a preview. Sends `<name>Data` (new picture),
 * `<name>` (keep the current one) or `<name>Remove`; the server reads them with
 * pictureFrom (app/lib/admin/imageUpload.js).
 */
export default function ImageField({ name, label, hint, current = "", round = false, maxEdge = 800, format = "", onChange }) {
  const [preview, setPreview] = useState(current);
  const [data, setData] = useState("");
  const [removed, setRemoved] = useState(false);
  const [note, setNote] = useState("");

  async function pick(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setNote("Use a PNG, JPG or WebP.");
      return;
    }
    try {
      const url = await shrink(file, maxEdge, format);
      setData(url);
      setPreview(url);
      onChange?.(url);
      setRemoved(false);
      setNote("");
    } catch {
      setNote("That file couldn't be read. Try another one.");
    }
  }

  return (
    <div className="logo-field">
      <div className={`logo-preview${round ? " round" : ""}`}>{preview ? <img src={preview} alt={`${label} preview`} /> : <span className="muted small">No {label.toLowerCase()} yet</span>}</div>
      <div className="form" style={{ gap: 8 }}>
        <span className="field-head">{label} {hint && <small>{hint}</small>}</span>
        <div className="actions">
          <label className="btn ghost small file-btn">
            {preview ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} hidden />
          </label>
          {preview && <button type="button" className="linkish danger-text" data-confirm="not-needed-read-only" onClick={() => { setPreview(""); setData(""); setRemoved(true); onChange?.(""); }}>Remove</button>}
        </div>
        {note && <p className="small error-text" role="alert">{note}</p>}
      </div>
      <input type="hidden" name={`${name}Data`} value={data} />
      <input type="hidden" name={name} value={removed || data ? "" : current} />
      {removed && <input type="hidden" name={`${name}Remove`} value="1" />}
    </div>
  );
}

/** The tiny round picture in a table row: photo, else logo, else initials. */
export function Avatar({ photo, logo, name }) {
  const src = photo || logo;
  const initials = String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return <span className={`row-avatar${!photo && logo ? " is-logo" : ""}`} aria-hidden="true">{src ? <img src={src} alt="" /> : initials}</span>;
}
