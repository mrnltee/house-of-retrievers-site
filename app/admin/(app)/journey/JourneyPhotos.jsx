"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { mb, shrinkPhoto } from "../../../lib/shrinkPhoto";
import { MAX_JOURNEY_PHOTOS } from "../../../lib/journeyEntries.mjs";
import {
  addJourneyPhoto, borrowEventPhotos, describeJourneyPhoto, eventAlbumForJourney,
  moveJourneyPhoto, removeJourneyPhoto, signJourneyPhotoUpload,
} from "../../journeyEntryActions";

const AT_ONCE = 2;

/**
 * A stop's photos: upload straight to Cloudinary (like the event album), or
 * borrow photos already in the linked event's album (they stay the album's —
 * removing them here never deletes them).
 */
export default function JourneyPhotos({ entryId, hasEvent, initialPhotos, connected }) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [notice, setNotice] = useState("");
  const [album, setAlbum] = useState(null); // null closed, [] loading/empty, array loaded
  const [picked, setPicked] = useState([]);
  const input = useRef(null);

  const update = (key, patch) => setQueue((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const full = photos.length >= MAX_JOURNEY_PHOTOS;

  async function addFiles(fileList) {
    const files = [...fileList].filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    setNotice("");
    setBusy(true);
    const signed = await signJourneyPhotoUpload(entryId).catch(() => ({ error: "Couldn't start the upload. Try again." }));
    if (signed.error) {
      setNotice(signed.error);
      setBusy(false);
      return;
    }
    const batch = files.slice(0, signed.room);
    if (batch.length < files.length) setNotice(`Only ${batch.length} more photo${batch.length === 1 ? "" : "s"} fit on this stop.`);
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
          const saved = await addJourneyPhoto(entryId, stored);
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

  async function openAlbum() {
    setNotice("");
    setAlbum([]);
    setPicked([]);
    const result = await eventAlbumForJourney(entryId).catch(() => ({ error: "Couldn't load the album." }));
    if (result.error) {
      setNotice(result.error);
      setAlbum(null);
      return;
    }
    setAlbum(result.photos);
  }

  function togglePick(id) {
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function addFromAlbum() {
    if (!picked.length) return;
    setBusy(true);
    const result = await borrowEventPhotos(entryId, picked).catch(() => ({ error: "Couldn't add those photos." }));
    setBusy(false);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    setAlbum(null);
    setPicked([]);
    setNotice(`Added ${result.added} photo${result.added === 1 ? "" : "s"} from the event's album.`);
    router.refresh();
  }

  async function saveDetails(photo, alt, fit) {
    if (alt === photo.alt && fit === photo.fit) return;
    const result = await describeJourneyPhoto(photo.id, alt, fit);
    if (result.error) setNotice(result.error);
    else setPhotos((current) => current.map((p) => (p.id === photo.id ? { ...p, alt, fit } : p)));
  }

  async function move(photo, direction) {
    const result = await moveJourneyPhoto(photo.id, direction);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    setPhotos((current) => {
      const order = [...current];
      const from = order.findIndex((p) => p.id === photo.id);
      const to = from + direction;
      if (to < 0 || to >= order.length) return current;
      [order[from], order[to]] = [order[to], order[from]];
      return order;
    });
  }

  async function remove(photo) {
    setConfirming(null);
    const result = await removeJourneyPhoto(photo.id);
    if (result.error) setNotice(result.error);
    else setPhotos((current) => current.filter((p) => p.id !== photo.id));
  }

  if (!connected) {
    return (
      <section className="card">
        <h2>Photos</h2>
        <p className="small">Photo storage isn't connected: add the three Cloudinary keys in Vercel, then redeploy.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="page-head" style={{ alignItems: "center" }}>
        <h2>Photos</h2>
        <span className="small muted">{photos.length} / {MAX_JOURNEY_PHOTOS}</span>
      </div>
      <p className="small muted">
        The first photo shows still; two or more fade and pan into each other. With no photos the card shows a designed placeholder. "Show whole" is for a poster or document shown uncropped.
      </p>

      <label className={`album-drop${busy || full ? " is-busy" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!busy && !full) addFiles(e.dataTransfer.files); }}>
        <input ref={input} type="file" accept="image/*" multiple disabled={busy || full} onChange={(e) => addFiles(e.target.files)} />
        <strong>{full ? "This stop is full" : busy ? "Adding photos…" : "Choose photos"}</strong>
        {!full && <span className="small muted">or drop them here</span>}
      </label>

      {hasEvent && (
        <div style={{ marginTop: 10 }}>
          {album === null ? (
            <button type="button" className="btn ghost small" onClick={openAlbum} disabled={full}>Use photos from the event's album</button>
          ) : (
            <div className="card" style={{ marginTop: 10 }}>
              <p className="small"><strong>Event album</strong></p>
              {album.length === 0 ? (
                <p className="small muted">Nothing left in the event's album, or it has none.</p>
              ) : (
                <ul className="album-grid">
                  {album.map((photo) => (
                    <li key={photo.id}>
                      {photo.thumb && <img src={photo.thumb} alt={photo.alt || ""} loading="lazy" />}
                      <label className="check small">
                        <input type="checkbox" checked={picked.includes(photo.id)} onChange={() => togglePick(photo.id)} /> Use this one
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <div className="actions">
                <button type="button" className="btn gold small" onClick={addFromAlbum} disabled={!picked.length || busy}>Add {picked.length || ""} to this stop</button>
                <button type="button" className="btn ghost small" onClick={() => { setAlbum(null); setPicked([]); }}>Close</button>
              </div>
            </div>
          )}
        </div>
      )}

      {notice && <p className="small" role="status">{notice}</p>}

      {queue.length > 0 && (
        <div className="album-queue" aria-live="polite">
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
          {photos.map((photo, i) => (
            <li key={photo.id}>
              {photo.thumb && <img src={photo.thumb} alt={photo.alt || ""} loading="lazy" />}
              <input
                type="text"
                aria-label="Describe this photo"
                placeholder="Optional: what's in the photo (blank reads as “stop title — photo 1”)"
                maxLength={200}
                defaultValue={photo.alt}
                onBlur={(e) => saveDetails(photo, e.target.value.trim(), photo.fit)}
              />
              <label className="check small">
                <input type="checkbox" defaultChecked={photo.fit === "contain"} onChange={(e) => saveDetails(photo, photo.alt, e.target.checked ? "contain" : "cover")} /> Show whole (poster)
              </label>
              <div className="album-photo-actions">
                <span className="small muted">{photo.source === "album" ? "From the event's album" : photo.source === "file" ? "Built in" : ""}</span>
                <button type="button" className="btn ghost small" onClick={() => move(photo, -1)} disabled={i === 0} aria-label="Move earlier">↑</button>
                <button type="button" className="btn ghost small" onClick={() => move(photo, 1)} disabled={i === photos.length - 1} aria-label="Move later">↓</button>
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
