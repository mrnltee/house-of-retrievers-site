"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { removeDonationFile, uploadDonationFile } from "../../../../donationActions";
import { resizeImageWithin } from "../../../../../lib/resizeImage";
import Icon from "../../../../../components/Icon";

const MAX_BYTES = 3 * 1024 * 1024;
const IMAGE_BUDGET = 2.5 * 1024 * 1024;
const FILLS = ["receiptName", "receiptAddress", "amount", "method", "receivedOn", "reference", "acknowledge", "publicName"];
const FILL_LABELS = { receiptName: "name on the receipt", receiptAddress: "mailing address", amount: "amount", method: "method", receivedOn: "date", reference: "reference no.", acknowledge: "thanks", publicName: "name to publish" };

/**
 * Attach a donor's returned donation form or proofs of payment, inside their edit window (owner, 22 Nov 2026).
 * Each file is saved as soon as it's picked (one request each, under the 4 MB cap); photos are shrunk first.
 * A returned PDF form is read, and its answers fill the window's fields for the admin to check before Save.
 * Removing asks first (Remove → Yes, remove). The table behind the window refreshes when the window closes.
 */
export default function DonationFiles({ eventId, contactId, kind, files: initial = [], base, label, hint }) {
  const [files, setFiles] = useState(initial);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const [confirming, setConfirming] = useState("");
  const input = useRef(null);
  const box = useRef(null);
  const router = useRouter();
  const isForm = kind === "form";

  // Refresh the table once the window closes, so counts and View buttons follow.
  function refreshOnClose() {
    const dialog = box.current?.closest("dialog");
    if (dialog && !dialog.dataset.refreshes) {
      dialog.dataset.refreshes = "1";
      dialog.addEventListener("close", () => { delete dialog.dataset.refreshes; router.refresh(); }, { once: true });
    }
  }

  function fillFromForm(read) {
    const form = box.current?.closest("form");
    if (!form || !read?.found) return [];
    const filled = [];
    const set = (name, value) => {
      const el = form.elements.namedItem(name);
      if (!el || value === "" || value == null) return;
      if (el.value !== value) { el.value = value; filled.push(FILL_LABELS[name] || name); }
    };
    for (const key of FILLS) set(key, read.donor[key]);
    // A returned form with an amount means they say they've given: the admin confirms on Save.
    if (read.donor.amount) set("status", "received");
    return filled;
  }

  async function add(list) {
    setMessage(null);
    for (const original of list) {
      setBusy(`Adding ${original.name}…`);
      let file = original;
      try {
        if (/^image\//.test(original.type) && original.type !== "image/gif") {
          const { dataUrl } = await resizeImageWithin(original, IMAGE_BUDGET);
          const blob = await (await fetch(dataUrl)).blob();
          file = new File([blob], original.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
        }
      } catch {
        file = original; // the server still checks the bytes
      }
      if (file.size > MAX_BYTES) { setMessage({ tone: "alert", text: `${original.name} is over 3 MB. Save the PDF smaller, or send a screenshot instead.` }); continue; }
      const data = new FormData();
      data.set("event", eventId);
      data.set("contact", contactId);
      data.set("kind", kind);
      data.set("file", file);
      try {
        const result = await uploadDonationFile(data);
        if (result?.error) { setMessage({ tone: "alert", text: result.error }); continue; }
        setFiles((now) => [...now, result.file]);
        refreshOnClose();
        if (isForm && result.read) {
          const filled = fillFromForm(result.read);
          const c = result.read.contact || {};
          const extra = [c.mobile && `mobile ${c.mobile}`, c.email && c.email, c.signedOn && `signed ${c.signedOn}`].filter(Boolean).join(" · ");
          setMessage(result.read.found
            ? { tone: "good", text: `${filled.length ? `Filled in from their form: ${filled.join(", ")}.` : "Their form matches what's here."} Check the details, then Save.${extra ? ` Their form also says: ${extra}.` : ""}` }
            : { tone: "", text: "Attached. We couldn't read answers from this file, so type the details in." });
        } else {
          setMessage({ tone: "good", text: `Attached ${result.file.name}.` });
        }
      } catch {
        setMessage({ tone: "alert", text: `Couldn't attach ${original.name}. Check your connection and try again.` });
      }
    }
    setBusy("");
    if (input.current) input.current.value = "";
  }

  async function remove(id) {
    setConfirming("");
    setBusy("Removing…");
    const data = new FormData();
    data.set("id", id);
    const result = await removeDonationFile(data).catch(() => ({ error: "Couldn't remove it. Try again." }));
    setBusy("");
    if (result?.error) { setMessage({ tone: "alert", text: result.error }); return; }
    setFiles((now) => now.filter((f) => f.id !== id));
    refreshOnClose();
    setMessage({ tone: result.unchecked ? "alert" : "", text: result.unchecked ? "Removed. That was the last proof, so the donation is no longer marked as checked." : "Removed." });
  }

  const full = !isForm && files.length >= 10;
  return (
    <div className="donation-files" ref={box}>
      <div className="donation-files-head">
        <span className="strong">{label}</span>
        {hint && <span className="small muted">{hint}</span>}
      </div>
      {files.length > 0 && (
        <ul className="donation-file-list">
          {files.map((f) => (
            <li key={f.id}>
              <a href={`${base}/donations/file/${f.id}`} target="_blank" rel="noopener noreferrer">
                {f.mime === "application/pdf" ? <span className="donation-file-pdf" aria-hidden="true">PDF</span> : <img src={`${base}/donations/file/${f.id}`} alt="" loading="lazy" />}
                <span className="small">{f.name}</span>
              </a>
              {confirming === f.id ? (
                <span className="donation-file-confirm">
                  <button type="button" className="btn small danger" data-confirm="inline-confirm-step" onClick={() => remove(f.id)}>Yes, remove</button>
                  <button type="button" className="btn small ghost" data-confirm="not-needed-read-only" onClick={() => setConfirming("")}>Keep</button>
                </span>
              ) : (
                <button type="button" className="btn small ghost" data-confirm="opens-inline-confirm" onClick={() => setConfirming(f.id)} disabled={Boolean(busy)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!(isForm && files.length > 0) && !full && (
        <label className="donation-file-add">
          <span className="btn small ghost">{isForm ? "Attach their returned form" : files.length ? "Add another proof" : "Attach proof of payment"}</span>
          <input ref={input} type="file" className="sr-only" accept="application/pdf,image/jpeg,image/png,image/webp" multiple={!isForm} disabled={Boolean(busy)} onChange={(e) => add([...e.target.files])} />
        </label>
      )}
      {isForm && files.length > 0 && <p className="small muted" style={{ margin: 0 }}>To use a different file, remove this one first.</p>}
      <p className={`small donation-file-note ${message?.tone || ""}`.trim()} role="status" aria-live="polite">{busy || message?.text || ""}</p>
    </div>
  );
}
