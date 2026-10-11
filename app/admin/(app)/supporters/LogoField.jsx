"use client";

import { useState } from "react";

/** Longest side of a stored logo; plenty for a 360 px tile on a retina screen. */
const MAX_EDGE = 800;

/** Shrinks a picked logo in the browser, keeping transparency (WebP, else PNG). */
async function shrink(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL("image/webp", 0.9);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

/** Logo picker with a preview in the same white tile the website uses. */
export default function LogoField({ current }) {
  const [preview, setPreview] = useState(current || "");
  const [data, setData] = useState("");
  const [removed, setRemoved] = useState(false);
  const [note, setNote] = useState("");

  async function pick(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setNote("Use a PNG, JPG or WebP. For an SVG logo, export it as PNG first.");
      return;
    }
    try {
      const url = await shrink(file);
      setData(url);
      setPreview(url);
      setRemoved(false);
      setNote("");
    } catch {
      setNote("That file couldn't be read. Try another one.");
    }
  }

  return (
    <div className="logo-field">
      <div className="logo-preview">{preview ? <img src={preview} alt="Logo preview" /> : <span className="muted small">No logo yet</span>}</div>
      <div className="form" style={{ gap: 8 }}>
        <span className="field-head">Logo <small>PNG with a transparent background works best. Shown in a white tile, so dark and light logos both read.</small></span>
        <div className="actions">
          <label className="btn ghost small file-btn">
            {preview ? "Replace logo" : "Upload logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} hidden />
          </label>
          {preview && (
            <button type="button" className="linkish danger-text" onClick={() => { setPreview(""); setData(""); setRemoved(true); }}>Remove</button>
          )}
        </div>
        {note && <p className="small error-text" role="alert">{note}</p>}
      </div>
      <input type="hidden" name="logoData" value={data} />
      <input type="hidden" name="logo" value={removed || data ? "" : current || ""} />
      {removed && <input type="hidden" name="logoRemove" value="1" />}
    </div>
  );
}
