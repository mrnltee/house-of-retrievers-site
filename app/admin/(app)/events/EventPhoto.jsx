"use client";

import { useState } from "react";
import { resizeImage } from "../../../lib/resizeImage";

/**
 * Pick a cover photo from the computer or phone. It is resized in the browser
 * (longest side 1600 px) and sent with the form; the description is required
 * whenever there is a photo.
 */
export default function EventPhoto({ current, currentAlt }) {
  const [preview, setPreview] = useState(current || "");
  const [data, setData] = useState("");
  const [removed, setRemoved] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onChange(event) {
    const file = event.target.files?.[0];
    setMessage("");
    if (!file) return;
    setBusy(true);
    try {
      const resized = await resizeImage(file);
      setData(resized.dataUrl);
      setPreview(resized.dataUrl);
      setRemoved(false);
      setMessage(`Ready: ${resized.width} × ${resized.height}, ${Math.round(resized.bytes / 1024)} KB. It's saved when you save the event.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setData("");
    setPreview("");
    setRemoved(true);
    setMessage("The photo will be removed when you save.");
  }

  const hasPhoto = Boolean(preview);
  return (
    <div className="row-2" style={{ alignItems: "start" }}>
      <div className="form" style={{ gap: 8 }}>
        <span className="field"><span>Cover photo <small>A JPG or PNG, straight from your phone is fine. We resize it for you.</small></span></span>
        <div className="event-photo-preview">
          {hasPhoto ? <img src={preview} alt="" /> : <span>No photo yet</span>}
        </div>
        <div className="actions">
          <label className="btn ghost small" style={{ cursor: "pointer" }}>
            {busy ? "Preparing…" : hasPhoto ? "Replace photo" : "Upload photo"}
            <input type="file" accept="image/*" onChange={onChange} className="visually-hidden" />
          </label>
          {hasPhoto && <button type="button" className="linkish" onClick={remove}>Remove</button>}
        </div>
        {message && <p className="small" role="status">{message}</p>}
        <input type="hidden" name="imageData" value={data} />
        <input type="hidden" name="imageRemove" value={removed ? "1" : ""} />
      </div>
      <label className="field">
        <span>Photo description <small>What is actually in the frame, for people using screen readers</small></span>
        <textarea name="imageAlt" maxLength={200} defaultValue={currentAlt || ""} required={hasPhoto} placeholder="e.g. Six golden retrievers in bandanas waiting at the start line" />
      </label>
    </div>
  );
}
