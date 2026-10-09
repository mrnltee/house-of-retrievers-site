"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { encodeJpeg, loadBitmap } from "../../../lib/resizeImage";
import PhotoCropper, { CROP_RATIO, clampCrop, cropSize, drawCrop, initialCrop } from "./PhotoCropper";

/** Saved width of the cropped cover. 1600 × 1000 stays sharp on a retina card. */
const OUTPUT_WIDTH = 1600;
/** The uncropped original is kept at this longest side, so re-framing later has room to zoom. */
const SOURCE_EDGE = 2400;
/** Below this many source pixels across, the card will look soft. */
const SOFT_WIDTH = 800;

const toStored = (bitmap, c) => ({ zoom: c.zoom, x: c.cx / bitmap.width, y: c.cy / bitmap.height });
const fromStored = (bitmap, s) =>
  s && Number.isFinite(s.zoom) ? clampCrop(bitmap, { zoom: s.zoom, cx: s.x * bitmap.width, cy: s.y * bitmap.height }) : initialCrop(bitmap);

/** Decode a picked file and shrink it to the size kept as the original. */
async function prepareOriginal(file) {
  const decoded = await loadBitmap(file);
  const scale = Math.min(1, SOURCE_EDGE / Math.max(decoded.width, decoded.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(decoded.width * scale);
  canvas.height = Math.round(decoded.height * scale);
  canvas.getContext("2d").drawImage(decoded, 0, 0, canvas.width, canvas.height);
  decoded.close?.();
  const { dataUrl } = await encodeJpeg(canvas);
  return { bitmap: await createImageBitmap(canvas), dataUrl };
}

/**
 * Pick a cover photo from the computer or phone, then frame it: the box
 * shows exactly what the event card will show (16:10). The framed photo is
 * made in the browser and sent with the form, together with the uncropped
 * original and the framing, so it can be re-framed later without losing
 * sharpness. The description is required whenever there is a photo.
 */
export default function EventPhoto({ current, currentAlt, currentSource, currentCrop }) {
  const [preview, setPreview] = useState(current || "");
  const [data, setData] = useState("");
  const [removed, setRemoved] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bitmap, setBitmap] = useState(null);
  const [crop, setCrop] = useState(null);
  /** A newly picked original (data URL), or the saved photo it was re-framed from (a path). */
  const [source, setSource] = useState({ data: "", path: "" });
  /** What to go back to if framing is cancelled. */
  const before = useRef(null);
  const timer = useRef(null);
  /** Bumped on cancel/remove so a slow export cannot overwrite the result. */
  const generation = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const exportCrop = useCallback(async (from, frame) => {
    const run = generation.current;
    const { w } = cropSize(from, frame.zoom);
    const canvas = document.createElement("canvas");
    drawCrop(canvas, from, frame, Math.min(OUTPUT_WIDTH, Math.round(w)));
    const { dataUrl, bytes } = await encodeJpeg(canvas);
    if (run !== generation.current) return;
    setData(dataUrl);
    setPreview(dataUrl);
    setRemoved(false);
    const soft = w < SOFT_WIDTH ? " This photo is small, so it may look soft on the card; zooming out helps." : "";
    setMessage(`Ready: ${canvas.width} × ${canvas.height}, ${Math.round(bytes / 1024)} KB. It's saved when you save the event.${soft}`);
  }, []);

  // Re-make the cover a moment after the framing stops changing, so saving
  // the event mid-adjustment still sends what is in the box.
  const onCropChange = useCallback(
    (next) => {
      setCrop(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => exportCrop(bitmap, next).catch((error) => setMessage(error.message)), 250);
    },
    [bitmap, exportCrop],
  );

  function startEditing() {
    before.current = { preview, data, removed, message, bitmap, crop, source };
    setEditing(true);
  }

  async function onPick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setMessage("");
    if (!file) return;
    setBusy(true);
    try {
      const original = await prepareOriginal(file);
      const frame = initialCrop(original.bitmap);
      startEditing();
      setBitmap(original.bitmap);
      setCrop(frame);
      setSource({ data: original.dataUrl, path: "" });
      await exportCrop(original.bitmap, frame);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  /** Frame again: from the photo picked in this visit, else from the saved original. */
  async function adjust() {
    if (bitmap && crop) {
      startEditing();
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const path = currentSource || preview;
      const response = await fetch(path);
      if (!response.ok) throw new Error("We could not load the current photo. Try uploading it again.");
      const loaded = await loadBitmap(await response.blob());
      startEditing();
      setBitmap(loaded);
      setCrop(currentSource ? fromStored(loaded, currentCrop) : initialCrop(loaded));
      setSource({ data: "", path });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function done() {
    const old = before.current?.bitmap;
    if (old && old !== bitmap) old.close?.();
    setEditing(false);
    before.current = null;
  }

  function cancel() {
    clearTimeout(timer.current);
    generation.current += 1;
    const b = before.current;
    if (b) {
      if (bitmap && b.bitmap !== bitmap) bitmap.close?.();
      setPreview(b.preview);
      setData(b.data);
      setRemoved(b.removed);
      setMessage(b.message);
      setBitmap(b.bitmap);
      setCrop(b.crop);
      setSource(b.source);
    }
    before.current = null;
    setEditing(false);
  }

  function reset() {
    if (bitmap) onCropChange(initialCrop(bitmap));
  }

  function remove() {
    clearTimeout(timer.current);
    generation.current += 1;
    bitmap?.close?.();
    setData("");
    setPreview("");
    setRemoved(true);
    setBitmap(null);
    setCrop(null);
    setSource({ data: "", path: "" });
    setEditing(false);
    setMessage("The photo will be removed when you save.");
  }

  const hasPhoto = Boolean(preview);
  const stored = data && bitmap && crop ? JSON.stringify(toStored(bitmap, crop)) : "";
  return (
    <div className="row-2" style={{ alignItems: "start" }}>
      <div className="form" style={{ gap: 8 }}>
        <span className="field">
          <span>Cover photo <small>A JPG or PNG, straight from your phone is fine. The box shows exactly what the event card will show.</small></span>
        </span>
        {editing && bitmap && crop ? (
          <>
            <PhotoCropper bitmap={bitmap} crop={crop} onChange={onCropChange} />
            <p className="small muted">Drag to move, zoom to fill. Arrow keys and + / − work too.</p>
            <div className="actions">
              <button type="button" className="btn small" onClick={done}>Done</button>
              <button type="button" className="btn ghost small" onClick={reset}>Reset</button>
              <button type="button" className="linkish" onClick={cancel}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div className="event-photo-preview" style={{ aspectRatio: CROP_RATIO }}>
              {hasPhoto ? <img src={preview} alt="" /> : <span>No photo yet</span>}
            </div>
            <div className="actions">
              <label className="btn ghost small" style={{ cursor: "pointer" }}>
                {busy ? "Preparing…" : hasPhoto ? "Replace photo" : "Upload photo"}
                <input type="file" accept="image/*" onChange={onPick} className="visually-hidden" disabled={busy} />
              </label>
              {hasPhoto && <button type="button" className="btn ghost small" onClick={adjust} disabled={busy}>Adjust framing</button>}
              {hasPhoto && <button type="button" className="linkish" onClick={remove}>Remove</button>}
            </div>
          </>
        )}
        {message && <p className="small" role="status">{message}</p>}
        <input type="hidden" name="imageData" value={data} />
        <input type="hidden" name="imageSourceData" value={data ? source.data : ""} />
        <input type="hidden" name="imageSource" value={data ? source.path : ""} />
        <input type="hidden" name="imageCrop" value={stored} />
        <input type="hidden" name="imageRemove" value={removed ? "1" : ""} />
      </div>
      <label className="field">
        <span>Photo description <small>What is actually in the frame, for people using screen readers</small></span>
        <textarea name="imageAlt" maxLength={200} defaultValue={currentAlt || ""} required={hasPhoto} placeholder="e.g. Six golden retrievers in bandanas waiting at the start line" />
      </label>
    </div>
  );
}
