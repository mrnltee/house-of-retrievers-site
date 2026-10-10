"use client";

import { useRef, useState } from "react";
import { loadBitmap } from "../../../lib/resizeImage";
import { addEventPhoto, describeEventPhoto, removeEventPhoto, signEventPhotoUpload } from "../../eventPhotos";

/** Longest side kept. Matches the server's incoming limit in app/lib/cloudinary.mjs. */
const MAX_EDGE = 2000;
/** WebP quality. Around 0.8 a photo is a fraction of its JPEG size with no visible loss. */
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.82;
const AT_ONCE = 2;

const mb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * Shrinks a photo before it leaves the device: longest side 2000 px, saved
 * as WebP (JPEG where the browser can't write WebP). Redrawing it also drops
 * the camera's hidden details, location included.
 */
async function shrink(file) {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
  if (!blob || blob.type !== "image/webp") blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("We couldn't read that photo.");
  return blob;
}

/**
 * The album for a past event: pick many photos at once; each is shrunk, sent
 * straight to Cloudinary, then listed here with a description field.
 */
export default function EventAlbum({ eventId, initialPhotos }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [queue, setQueue] = useState([]); // { key, name, before, after, state, message }
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [notice, setNotice] = useState("");
  const input = useRef(null);

  const update = (key, patch) => setQueue((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  async function addFiles(fileList) {
    const files = [...fileList].filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    setNotice("");
    setBusy(true);
    const signed = await signEventPhotoUpload(eventId).catch(() => ({ error: "Couldn't start the upload. Try again." }));
    if (signed.error) {
      setNotice(signed.error);
      setBusy(false);
      return;
    }
    const batch = files.slice(0, signed.room);
    if (batch.length < files.length) setNotice(`Only ${batch.length} more photos fit in this album.`);
    const items = batch.map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file, name: file.name, before: file.size, after: 0, state: "waiting", message: "" }));
    setQueue((current) => [...items.map(({ file, ...rest }) => rest), ...current]);

    let next = 0;
    async function worker() {
      while (next < items.length) {
        const item = items[next];
        next += 1;
        try {
          update(item.key, { state: "shrinking" });
          const blob = await shrink(item.file);
          update(item.key, { state: "uploading", after: blob.size });
          const body = new FormData();
          for (const [key, value] of Object.entries(signed.upload.fields)) body.append(key, value);
          body.append("file", blob, item.name.replace(/\.[^.]+$/, "") + (blob.type === "image/webp" ? ".webp" : ".jpg"));
          const response = await fetch(signed.upload.url, { method: "POST", body });
          const stored = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(stored?.error?.message || "Upload refused");
          const saved = await addEventPhoto(eventId, stored);
          if (saved.error) throw new Error(saved.error);
          setPhotos((current) => [...current, saved.photo]);
          update(item.key, { state: "done", after: stored.bytes || blob.size });
        } catch (error) {
          update(item.key, { state: "failed", message: error.message || "Upload failed" });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(AT_ONCE, items.length) }, worker));
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  async function saveAlt(photo, alt) {
    if (alt === photo.alt) return;
    const result = await describeEventPhoto(photo.id, alt);
    if (result.error) setNotice(result.error);
    else setPhotos((current) => current.map((p) => (p.id === photo.id ? { ...p, alt } : p)));
  }

  async function remove(photo) {
    setConfirming(null);
    const result = await removeEventPhoto(photo.id);
    if (result.error) setNotice(result.error);
    else setPhotos((current) => current.filter((p) => p.id !== photo.id));
  }

  const stored = photos.reduce((sum, p) => sum + (p.bytes || 0), 0);
  const done = queue.filter((item) => item.state === "done");
  const saved = done.reduce((sum, item) => sum + Math.max(0, item.before - item.after), 0);

  return (
    <section className="card">
      <div className="page-head" style={{ alignItems: "center" }}>
        <h2>Album</h2>
        <span className="small muted">{photos.length} {photos.length === 1 ? "photo" : "photos"} · {mb(stored)} stored</span>
      </div>
      <p className="small muted">
        Add as many photos as you like. Each one is shrunk on this device before it's sent (longest side 2000 px, saved as WebP), so a 5 MB phone photo is stored at around 300 KB. Location data is removed. Photos appear on the event page straight away.
      </p>
      <label className={`album-drop${busy ? " is-busy" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!busy) addFiles(e.dataTransfer.files); }}>
        <input ref={input} type="file" accept="image/*" multiple disabled={busy} onChange={(e) => addFiles(e.target.files)} />
        <strong>{busy ? "Adding photos…" : "Choose photos"}</strong>
        <span className="small muted">or drop them here</span>
      </label>
      {notice && <p className="small" role="status">{notice}</p>}

      {queue.length > 0 && (
        <div className="album-queue" aria-live="polite">
          {done.length > 0 && <p className="small"><strong>{done.length} added</strong>{saved > 0 && <> · {mb(saved)} saved by shrinking</>}</p>}
          <ul>
            {queue.filter((item) => item.state !== "done").map((item) => (
              <li key={item.key} className={`is-${item.state}`}>
                <span className="album-name">{item.name}</span>
                <span className="small muted">
                  {item.state === "waiting" && "Waiting…"}
                  {item.state === "shrinking" && `Shrinking ${mb(item.before)}…`}
                  {item.state === "uploading" && `${mb(item.before)} → ${mb(item.after)}, uploading…`}
                  {item.state === "failed" && `Not added: ${item.message}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {photos.length > 0 && (
        <ul className="album-grid">
          {photos.map((photo) => (
            <li key={photo.id}>
              <img src={photo.thumb} alt={photo.alt || ""} width={photo.width} height={photo.height} loading="lazy" />
              <input
                type="text"
                aria-label="Describe this photo"
                placeholder="Describe the photo (optional)"
                maxLength={200}
                defaultValue={photo.alt}
                onBlur={(e) => saveAlt(photo, e.target.value.trim())}
              />
              <div className="album-photo-actions">
                <span className="small muted">{mb(photo.bytes)}</span>
                {confirming === photo.id ? (
                  <>
                    <button type="button" className="btn danger small" onClick={() => remove(photo)}>Yes, remove</button>
                    <button type="button" className="btn ghost small" onClick={() => setConfirming(null)}>Keep</button>
                  </>
                ) : (
                  <button type="button" className="btn ghost small" onClick={() => setConfirming(photo.id)}>Remove</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
