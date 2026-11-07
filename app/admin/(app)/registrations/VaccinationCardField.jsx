"use client";

import { useRef, useState } from "react";
import { resizeImageWithin } from "../../../lib/resizeImage";
import { MAX_IMAGES_PER_FURBABY, vaccinationBudget } from "../../../lib/vaccinationRecords.mjs";
import { addVaccinationCard, removeVaccinationCard } from "../../registrationActions";
import ConfirmButton from "../ConfirmButton";

/** Each photo is shrunk so a full set of five still fits in one save (the request ceiling is 4 MB). */
const PHOTO_BYTES = vaccinationBudget(MAX_IMAGES_PER_FURBABY);

/**
 * Adds, replaces or removes photos of a furbaby's vaccination card by hand, for
 * a registrant who sent it outside the RSVP form.
 *
 * - Adding (no `page`): photos queue up as they are chosen (several at once),
 *   dropped or pasted (the page-wide PasteImages fills this field's upload), so
 *   the admin keeps adding without saving in between and saves the lot once.
 *   `remaining` is how many more photos this furbaby can still take.
 * - Replacing or removing one existing photo (`page`): one photo, as before.
 */
export default function VaccinationCardField({ registrationId, index, page, label, hasCard, adding = false, remaining = MAX_IMAGES_PER_FURBABY }) {
  const replacing = page !== undefined;
  const [queue, setQueue] = useState([]); // [{ id, dataUrl }]
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const counted = useRef(0); // queued + being read, so quick picks and pastes can't overshoot
  const chain = useRef(Promise.resolve());
  const room = replacing ? 1 : remaining;

  function pick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // so the same photo can be chosen again, and the next paste starts fresh
    if (!files.length) return;
    const images = files.filter((f) => /^image\//.test(f.type));
    const notes = [];
    if (images.length < files.length) notes.push("Only photos are accepted (JPG, PNG or HEIC from a phone).");
    const take = images.slice(0, Math.max(0, room - counted.current));
    if (take.length < images.length) notes.push(`Only ${room} photo${room === 1 ? "" : "s"} fit${room === 1 ? "s" : ""} here, so ${images.length - take.length} ${images.length - take.length === 1 ? "was" : "were"} left out.`);
    counted.current += take.length;
    setNote(notes.join(" "));
    if (!take.length) return;
    setBusy(true);
    chain.current = chain.current.then(async () => {
      for (const file of take) {
        try {
          const { dataUrl } = await resizeImageWithin(file, PHOTO_BYTES);
          setQueue((q) => (replacing ? [{ id: crypto.randomUUID(), dataUrl }] : [...q, { id: crypto.randomUUID(), dataUrl }]));
        } catch (error) {
          counted.current -= 1;
          setNote(error?.message || "That photo couldn't be read. Try another one.");
        }
      }
      setBusy(false);
    });
  }

  function drop(id) {
    counted.current = Math.max(0, counted.current - 1);
    setQueue((q) => q.filter((item) => item.id !== id));
    setNote("");
  }

  function clear() {
    counted.current = 0;
    setQueue([]);
    setNote("");
  }

  const full = queue.length >= room;
  const count = queue.length;
  const subject = hasCard ? "Replace this photo of" : `Save ${count === 1 ? "a new photo" : `${count} new photos`} for`;

  return (
    <div className={`form${replacing ? "" : " field vaccination-add"}`} style={{ gap: 8 }}>
      {/* The upload stays on the page while photos are queued, so choosing, dropping and pasting keep working. */}
      {!replacing && !full && (
        <div className="actions">
          <label className="btn ghost small file-btn">
            {count ? "Add more photos" : adding ? "Add another photo" : "Add card"}
            <input ref={input} type="file" accept="image/*" multiple={room > 1} onChange={pick} hidden />
          </label>
          <span className="small muted">{count ? `${room - count} more fit${room - count === 1 ? "s" : ""}. ` : ""}Choose several, drop them here, or paste (click here, then ⌘V / Ctrl+V).</span>
        </div>
      )}
      {replacing && !count && (
        <div className="actions">
          <label className="btn ghost small file-btn">
            Replace
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

      {count > 0 && (
        <form action={addVaccinationCard} className="form" style={{ gap: 8 }}>
          <input type="hidden" name="id" value={registrationId} />
          <input type="hidden" name="index" value={index} />
          {replacing && <input type="hidden" name="page" value={page} />}
          {queue.map((item) => <input key={item.id} type="hidden" name="cardData" value={item.dataUrl} />)}
          <div className="vaccination-queue">
            {queue.map((item, n) => (
              <figure key={item.id} className="vaccination-queued">
                <img src={item.dataUrl} alt={`New vaccination card photo ${n + 1} for ${label}`} />
                <button type="button" className="linkish" onClick={() => drop(item.id)} aria-label={`Remove new photo ${n + 1} from this batch`}>Remove</button>
              </figure>
            ))}
          </div>
          {full && !replacing && <p className="small muted" style={{ margin: 0 }}>That's every photo this furbaby can hold. Save these, or remove one to add a different photo.</p>}
          <div className="actions">
            <ConfirmButton
              className="btn gold small"
              disabled={busy}
              title={`${subject} the vaccination card for ${label}?`}
              items={[hasCard ? "The photo on file is replaced with this one" : count === 1 ? "This photo is added to their vaccination card" : `These ${count} photos are added to their vaccination card`, "They stay private to admins and are never emailed", "Your name is kept as the person who added them"]}
              yes={count === 1 ? "Yes, save photo" : `Yes, save ${count} photos`}
            >{busy ? "Preparing…" : count === 1 ? "Save photo" : `Save ${count} photos`}</ConfirmButton>
            <button type="button" className="linkish" onClick={clear}>{count === 1 ? "Cancel" : "Clear all"}</button>
          </div>
        </form>
      )}
      {note && <p className="small error-text" role="alert">{note}</p>}
    </div>
  );
}
