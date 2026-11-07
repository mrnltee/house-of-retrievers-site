"use client";

import { useEffect, useRef, useState } from "react";
import { mb, shrinkPhoto } from "../../../lib/shrinkPhoto";
import { addEventPhoto, describeEventPhoto, removeEventPhoto, removeEventPhotos, signEventPhotoUpload } from "../../eventPhotos";

const AT_ONCE = 2;
// Keep in step with eventPhotos.js.
const REMOVE_AT_ONCE = 100;
const photoCount = (n) => `${n} ${n === 1 ? "photo" : "photos"}`;
const storageNote = (n) => (n ? ` ${n === 1 ? "1 file" : `${n} files`} couldn't be cleared from storage; delete ${n === 1 ? "it" : "them"} in Cloudinary's Media Library.` : "");

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
  const [selected, setSelected] = useState(() => new Set());
  const [confirmingMany, setConfirmingMany] = useState(false);
  const [removing, setRemoving] = useState(false);
  const lastPicked = useRef(null);
  const input = useRef(null);

  // Drop ids for photos that are no longer in the album.
  useEffect(() => {
    setSelected((current) => {
      const ids = new Set(photos.map((p) => p.id));
      const kept = [...current].filter((id) => ids.has(id));
      return kept.length === current.size ? current : new Set(kept);
    });
  }, [photos]);

  // Shift-click selects the run between the last photo picked and this one.
  function toggle(photoId, shiftKey) {
    setConfirmingMany(false);
    const anchor = lastPicked.current;
    setSelected((current) => {
      const next = new Set(current);
      const turnOn = !current.has(photoId);
      const from = photos.findIndex((p) => p.id === anchor);
      const to = photos.findIndex((p) => p.id === photoId);
      const run = shiftKey && from !== -1 ? photos.slice(Math.min(from, to), Math.max(from, to) + 1) : [photos[to]];
      for (const p of run) turnOn ? next.add(p.id) : next.delete(p.id);
      return next;
    });
    lastPicked.current = photoId;
  }

  const clearSelection = () => { setSelected(new Set()); setConfirmingMany(false); };
  const clearOnEscape = (e) => { if (e.key === "Escape" && selected.size) clearSelection(); };
  const allSelected = photos.length > 0 && selected.size === photos.length;
  const batch = Math.min(selected.size, REMOVE_AT_ONCE);

  async function removeSelected() {
    const ids = [...selected].slice(0, REMOVE_AT_ONCE);
    setRemoving(true);
    setNotice("");
    const result = await removeEventPhotos(eventId, ids).catch(() => ({ error: "Couldn't remove the photos. Try again." }));
    setRemoving(false);
    setConfirmingMany(false);
    if (result.error) return setNotice(result.error);
    const gone = new Set(result.removed);
    setPhotos((current) => current.filter((p) => !gone.has(p.id)));
    const rest = selected.size - gone.size;
    setNotice(`Removed ${photoCount(gone.size)}.${storageNote(result.left)}${rest > 0 ? ` ${photoCount(rest)} still selected.` : ""}`);
  }

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
          const blob = await shrinkPhoto(item.file);
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
    else {
      setPhotos((current) => current.filter((p) => p.id !== photo.id));
      if (result.left) setNotice(`Removed the photo.${storageNote(result.left)}`);
    }
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
        <div className={`album-select-bar${selected.size ? " has-selection" : ""}`} onKeyDown={clearOnEscape}>
          <label className="album-check-all small">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !allSelected; }}
              onChange={() => (allSelected ? clearSelection() : setSelected(new Set(photos.map((p) => p.id))))}
              disabled={removing}
            />
            {selected.size ? `${selected.size} selected` : "Select all"}
          </label>
          {selected.size > 0 && (
            <div className="album-select-actions">
              {confirmingMany ? (
                <>
                  <span className="small">Remove {photoCount(batch)} for good?{selected.size > batch ? ` (${REMOVE_AT_ONCE} at a time)` : ""}</span>
                  <button type="button" className="btn danger small" onClick={removeSelected} disabled={removing}>
                    {removing ? "Removing…" : "Yes, remove"}
                  </button>
                  <button type="button" className="btn ghost small" onClick={() => setConfirmingMany(false)} disabled={removing}>Keep</button>
                </>
              ) : (
                <>
                  <button type="button" className="btn ghost small" onClick={clearSelection}>Clear</button>
                  <button type="button" className="btn danger small" onClick={() => setConfirmingMany(true)}>
                    Remove {photoCount(batch)}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <ul className={`album-grid${selected.size ? " is-selecting" : ""}`} onKeyDown={clearOnEscape}>
          {photos.map((photo, index) => (
            <li key={photo.id} className={selected.has(photo.id) ? "is-selected" : undefined}>
              <label className="album-pick">
                <input
                  type="checkbox"
                  checked={selected.has(photo.id)}
                  onChange={(e) => toggle(photo.id, e.nativeEvent.shiftKey)}
                  disabled={removing}
                  aria-label={`Select photo ${index + 1}${photo.alt ? `: ${photo.alt}` : ""}`}
                />
              </label>
              <img onClick={(e) => { if (selected.size || e.shiftKey) toggle(photo.id, e.shiftKey); }} src={photo.thumb} alt={photo.alt || ""} width={photo.width} height={photo.height} loading="lazy" />
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
