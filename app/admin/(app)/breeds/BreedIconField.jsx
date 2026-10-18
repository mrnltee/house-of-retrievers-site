"use client";

import { useRef, useState } from "react";
import { uploadBreedIcon } from "../../breedActions";
import ConfirmButton from "../ConfirmButton";

/** Pick a file, see it next to the current icon, then save (asks first). */
export default function BreedIconField({ breedKey, label }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const input = useRef(null);

  function pick(event) {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    if (!["image/svg+xml", "image/png", "image/webp"].includes(chosen.type)) return setNote("Use an SVG, PNG or WebP file.");
    if (chosen.size > 100 * 1024) return setNote("That file is larger than 100 KB.");
    const reader = new FileReader();
    reader.onload = () => { setFile({ name: chosen.name, url: String(reader.result) }); setNote(""); };
    reader.readAsDataURL(chosen);
  }

  return (
    <div className="breed-icon-field">
      {file ? (
        <form action={uploadBreedIcon} className="actions">
          <img src={file.url} alt={`New icon for ${label}`} width={40} height={40} className="breed-icon-preview" />
          <input type="hidden" name="key" value={breedKey} />
          <input type="hidden" name="iconData" value={file.url} />
          <ConfirmButton className="btn gold small" title={`Use this icon for ${label}?`} items={["It replaces the current icon on the RSVP, Join form and admin pages", "You can go back to the built-in icon at any time"]} yes="Yes, use it">Save icon</ConfirmButton>
          <button type="button" className="linkish" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }}>Cancel</button>
        </form>
      ) : (
        <label className="btn ghost small file-btn">Upload icon<input ref={input} type="file" accept="image/svg+xml,image/png,image/webp" onChange={pick} hidden /></label>
      )}
      {note && <p className="small error-text" role="alert">{note}</p>}
    </div>
  );
}
