"use client";

import { useRef, useState } from "react";
import { loadBitmap } from "../../../lib/resizeImage";
import { addVaccinationCard, removeVaccinationCard } from "../../registrationActions";
import ConfirmButton from "../ConfirmButton";

/** Longest side and quality sent up; one card stays well under the 4 MB request cap. */
const EDGE = 1600;
const QUALITY = 0.82;

/**
 * Adds, replaces or removes one photo of a furbaby's vaccination card by hand,
 * for a registrant who sent it outside the RSVP form. `page` is the photo's
 * position when replacing or removing one that exists; without it the photo is
 * added in the next free slot (`adding`: the furbaby already has some).
 */
export default function VaccinationCardField({ registrationId, index, page, label, hasCard, adding = false }) {
  const [preview, setPreview] = useState("");
  const [note, setNote] = useState("");
  const input = useRef(null);

  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) return setNote("Pick a photo of the card (JPG, PNG or HEIC from a phone).");
    try {
      const bitmap = await loadBitmap(file);
      const scale = Math.min(1, EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setPreview(canvas.toDataURL("image/jpeg", QUALITY));
      setNote("");
    } catch {
      setNote("That photo couldn't be read. Try another one.");
    }
  }

  function cancel() {
    setPreview("");
    if (input.current) input.current.value = "";
  }

  return (
    <div className="form" style={{ gap: 8 }}>
      {preview ? (
        <form action={addVaccinationCard} className="form" style={{ gap: 8 }}>
          <img src={preview} alt={`New vaccination card for ${label}`} style={{ maxWidth: "100%", borderRadius: 8 }} />
          <input type="hidden" name="id" value={registrationId} />
          <input type="hidden" name="index" value={index} />
          {page !== undefined && <input type="hidden" name="page" value={page} />}
          <input type="hidden" name="cardData" value={preview} />
          <div className="actions">
            <ConfirmButton
              className="btn gold small"
              title={`${hasCard ? "Replace this photo of" : "Save a new photo of"} the vaccination card for ${label}?`}
              items={[hasCard ? "The photo on file is replaced with this one" : "This photo is added to their vaccination card", "It stays private to admins and is never emailed", "Your name is kept as the person who added it"]}
              yes="Yes, save photo"
            >Save photo</ConfirmButton>
            <button type="button" className="linkish" onClick={cancel}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="actions">
          <label className="btn ghost small file-btn">
            {hasCard ? "Replace" : adding ? "Add another photo" : "Add card"}
            <input ref={input} type="file" accept="image/*" onChange={pick} hidden />
          </label>
          {hasCard && (
            <form action={removeVaccinationCard}>
              <input type="hidden" name="id" value={registrationId} />
              <input type="hidden" name="index" value={index} />
              <input type="hidden" name="page" value={page ?? 0} />
              <ConfirmButton
                className="linkish"
                title={`Remove this vaccination photo for ${label}?`}
                items={["This photo is deleted from the registration (their other photos stay)", "You can add a new one at any time"]}
                yes="Yes, remove it"
              >Remove</ConfirmButton>
            </form>
          )}
        </div>
      )}
      {note && <p className="small error-text" role="alert">{note}</p>}
    </div>
  );
}
