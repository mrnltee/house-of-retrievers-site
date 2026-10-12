"use client";

import { useRef, useState } from "react";
import { loadBitmap } from "../../../lib/resizeImage";
import { removePersonPhoto, uploadPersonPhoto } from "../../actions";

/** Longest side sent up; the server keeps a 480 px WebP copy. */
const EDGE = 960;

/**
 * Profile photo for a person in People: pick one (from their Facebook or
 * Instagram, or one they sent), check the round preview, save. Replaces the
 * Join-form photo if there was one.
 */
export default function PersonPhotoField({ personId, current, name }) {
  const [preview, setPreview] = useState("");
  const [data, setData] = useState("");
  const [note, setNote] = useState("");
  const input = useRef(null);

  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) return setNote("Pick a photo (JPG, PNG or HEIC from a phone).");
    try {
      const bitmap = await loadBitmap(file);
      const scale = Math.min(1, EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg", 0.86);
      setData(url);
      setPreview(url);
      setNote("");
    } catch {
      setNote("That photo couldn't be read. Try another one.");
    }
  }

  return (
    <div className="person-photo-field">
      {preview ? (
        <form action={uploadPersonPhoto} className="actions">
          <img className="person-avatar" src={preview} alt={`New photo for ${name}`} width={64} height={64} />
          <input type="hidden" name="id" value={personId} />
          <input type="hidden" name="photoData" value={data} />
          <button className="btn gold small">Save photo</button>
          <button type="button" className="linkish" onClick={() => { setPreview(""); setData(""); if (input.current) input.current.value = ""; }}>Cancel</button>
        </form>
      ) : (
        <div className="actions">
          <label className="btn ghost small file-btn">
            {current ? "Change photo" : "Add a photo"}
            <input ref={input} type="file" accept="image/*" onChange={pick} hidden />
          </label>
          {current && (
            <form action={removePersonPhoto}>
              <input type="hidden" name="id" value={personId} />
              <button className="linkish danger-text">Remove</button>
            </form>
          )}
        </div>
      )}
      {note && <p className="small error-text" role="alert">{note}</p>}
    </div>
  );
}
