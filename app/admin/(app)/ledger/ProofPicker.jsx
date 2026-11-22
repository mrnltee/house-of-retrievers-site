"use client";

import { useState } from "react";
import { resizeImageWithin } from "../../../lib/resizeImage";

// Everything travels with the form, under the admin's 4 MB request cap (base64 adds a third).
const IMAGE_BUDGET = 700 * 1024;
const PDF_MAX = 2.5 * 1024 * 1024;
const TOTAL_MAX = 2.7 * 1024 * 1024;

const asDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("read"));
  reader.readAsDataURL(blob);
});

/**
 * Receipts and proofs for a ledger line (owner, 22 Nov 2026): picked (or pasted, via PasteImages) before Save,
 * shrunk in the browser, sent with the form as hidden proofData / proofName fields. Each can be taken off
 * before saving. The server checks the bytes again and refuses an expense or turnover with no proof.
 */
export default function ProofPicker({ label, hint, required = false }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function add(list) {
    setBusy(true);
    setNote("");
    const next = [...files];
    for (const file of list) {
      try {
        let dataUrl;
        let size;
        if (file.type === "application/pdf") {
          if (file.size > PDF_MAX) { setNote(`${file.name} is over 2.5 MB. Save the PDF smaller, or attach a photo of it.`); continue; }
          dataUrl = await asDataUrl(file);
          size = file.size;
        } else if (/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || /\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
          const shrunk = await resizeImageWithin(file, IMAGE_BUDGET);
          dataUrl = shrunk.dataUrl;
          size = shrunk.bytes;
        } else {
          setNote(`${file.name}: use a PDF or a photo.`);
          continue;
        }
        if (next.reduce((t, f) => t + f.size, 0) + size > TOTAL_MAX) { setNote("That's as much as one save can carry. Save, then add the rest by editing the line."); break; }
        next.push({ name: file.name.replace(/\.(heic|heif|png|webp)$/i, ".jpg"), dataUrl, size, image: dataUrl.startsWith("data:image") });
      } catch {
        setNote(`${file.name} couldn't be read. Try another file.`);
      }
    }
    setFiles(next);
    setBusy(false);
  }

  return (
    <div className="donation-files proof-picker">
      <div className="donation-files-head">
        <span className="strong">{label}{required && <span className="muted small"> · required</span>}</span>
        {hint && <span className="small muted">{hint}</span>}
      </div>
      {files.length > 0 && (
        <ul className="donation-file-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <span className="donation-file-item">
                {f.image ? <img src={f.dataUrl} alt="" /> : <span className="donation-file-pdf" aria-hidden="true">PDF</span>}
                <span className="small">{f.name}</span>
              </span>
              <input type="hidden" name="proofData" value={f.dataUrl} />
              <input type="hidden" name="proofName" value={f.name} />
              <button type="button" className="btn small ghost" data-confirm="not-needed-read-only" onClick={() => setFiles(files.filter((_, j) => j !== i))}>Take off</button>
            </li>
          ))}
        </ul>
      )}
      <label className="donation-file-add">
        <span className="btn small ghost">{files.length ? "Add another file" : "Choose a photo or PDF"}</span>
        <input type="file" className="sr-only" accept="application/pdf,image/*" multiple disabled={busy} onChange={(e) => { add([...e.target.files]); e.target.value = ""; }} />
      </label>
      <p className="small donation-file-note" role="status" aria-live="polite">{busy ? "Getting the file ready…" : note || (files.length ? `${files.length} file${files.length === 1 ? "" : "s"} will be saved with this line.` : "")}</p>
    </div>
  );
}
