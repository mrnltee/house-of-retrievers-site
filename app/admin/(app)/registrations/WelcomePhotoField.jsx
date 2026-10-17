"use client";

import { useRef, useState } from "react";
import { loadBitmap } from "../../../lib/resizeImage";
import { uploadWelcomePhoto, useInitialsWelcomePhoto, useProfileWelcomePhoto } from "../../registrationActions";
import { welcomePhotoOptions } from "../../../lib/welcomePhoto.mjs";
import ConfirmButton from "../ConfirmButton";

/** Longest side sent up; the server keeps a 480 px WebP copy. */
const EDGE = 960;

/**
 * Sets the photo the check-in welcome card shows for one RSVP: upload one,
 * go back to their People profile photo, or show initials.
 */
export default function WelcomePhotoField({ registrationId, name, source, hasMatch, matchPhotoId, canSaveToPerson }) {
  const options = welcomePhotoOptions({ source, matchPhotoId });
  const [preview, setPreview] = useState("");
  const [data, setData] = useState("");
  const [toProfile, setToProfile] = useState(false);
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

  function cancel() {
    setPreview("");
    setData("");
    setToProfile(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="form" style={{ gap: 12 }}>
      {preview ? (
        <form action={uploadWelcomePhoto} className="form" style={{ gap: 10 }}>
          <img className="person-avatar" src={preview} alt={`New welcome photo for ${name}`} width={96} height={96} />
          <input type="hidden" name="id" value={registrationId} />
          <input type="hidden" name="photoData" value={data} />
          {hasMatch && canSaveToPerson && (
            <label className="check"><input type="checkbox" name="saveToPerson" checked={toProfile} onChange={(e) => setToProfile(e.target.checked)} /> <span>Also save this photo to their People profile</span></label>
          )}
          <div className="actions">
            <ConfirmButton
              className="btn gold small"
              title={`Save this welcome photo for ${name}?`}
              items={[
                "The door shows this photo when they check in",
                ...(toProfile ? ["Their People profile photo is replaced with it"] : []),
                "The photo stays private to admins",
              ]}
              yes="Yes, save photo"
            >Save photo</ConfirmButton>
            <button type="button" className="linkish" onClick={cancel}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="actions">
          <label className="btn ghost small file-btn">
            {source === "own" ? "Change photo" : "Upload a photo"}
            <input ref={input} type="file" accept="image/*" onChange={pick} hidden />
          </label>
          {options.useProfile && (
            <form action={useProfileWelcomePhoto}>
              <input type="hidden" name="id" value={registrationId} />
              <ConfirmButton
                className="linkish"
                title={`Use ${name}'s People profile photo?`}
                items={["The door shows the photo from their People profile", ...(source === "own" ? ["The photo uploaded for this RSVP is no longer used"] : [])]}
                yes="Yes, use it"
              >Use the photo from their People profile</ConfirmButton>
            </form>
          )}
          {options.showInitials && (
            <form action={useInitialsWelcomePhoto}>
              <input type="hidden" name="id" value={registrationId} />
              <ConfirmButton
                className="linkish"
                title={`Show ${name}'s initials instead?`}
                items={["The door shows their initials instead of a photo", "You can switch back at any time"]}
                yes="Yes, show initials"
              >Show initials instead</ConfirmButton>
            </form>
          )}
        </div>
      )}
      {note && <p className="small error-text" role="alert">{note}</p>}
    </div>
  );
}
