"use client";

import { useEffect, useRef, useState } from "react";

/** What each field is called in the confirmation list. Fields not listed here are folded into their group. */
const LABELS = {
  title: "Title",
  slug: "Web address",
  category: "Category",
  purpose: "Purpose",
  date: "Date",
  startTime: "Start time",
  endTime: "End time",
  cost: "Price",
  priceTiers: "Price",
  gallery: "More photos",
  photoUploads: "Photos from guests",
  isCharity: "Charity event",
  supports: "Beneficiary",
  summary: "Summary",
  hashtags: "Hashtags",
  venue: "Venue",
  city: "City",
  venueLat: "Map pin",
  venueLng: "Map pin",
  mapUrl: "Google Maps link",
  imageData: "Cover photo",
  imageSource: "Cover photo",
  imageSourceData: "Cover photo",
  imageCrop: "Cover photo framing",
  imageRemove: "Cover photo",
  imageAlt: "Photo description",
  registration: "Registration",
  capacity: "Capacity",
  rsvpOpen: "RSVPs open",
  feeRequired: "Fee required",
};

/** The copy for each button that asks first, keyed by the button's data-confirm. */
const COPY = {
  save: {
    title: "Save these changes?",
    lead: "This event is live, so visitors see the changes as soon as you save.",
    go: "Save changes",
    tone: "gold",
  },
  publish: {
    title: "Publish this event?",
    lead: "It goes on the events page straight away, and anyone with the link can see it.",
    go: "Publish",
    tone: "gold",
  },
  unpublish: {
    title: "Move back to draft?",
    lead: "The event comes off the events page. Its link stops working until you publish again.",
    go: "Move to draft",
    tone: "ink",
  },
  cancel: {
    title: "Cancel this event?",
    lead: "The event page will say it's cancelled. RSVPs and registrations are kept.",
    go: "Cancel event",
    tone: "danger",
  },
};

function snapshot(form) {
  const values = {};
  for (const [name, value] of new FormData(form)) {
    if (!(name in LABELS)) continue;
    const text = typeof value === "string" ? value : value?.name || "";
    values[name] = name in values ? `${values[name]}\u0000${text}` : text;
  }
  return values;
}

function changedLabels(before, after) {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  const labels = [];
  for (const name of names) {
    if ((before[name] ?? "") === (after[name] ?? "")) continue;
    const label = LABELS[name];
    if (!labels.includes(label)) labels.push(label);
  }
  return labels;
}

/**
 * Sits inside the event form. Buttons with `data-confirm` ("save", "publish",
 * "unpublish", "cancel") open a dialog first; the dialog lists what changed
 * since the page loaded, and only "confirm" sends the form, through the same
 * button, so its own server action still runs.
 */
export default function ConfirmSave() {
  const anchor = useRef(null);
  const dialog = useRef(null);
  const initial = useRef(null);
  const pending = useRef(null);
  const confirmed = useRef(false);
  const [state, setState] = useState(null); // { kind, changes }

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return undefined;
    // Client fields (photo, map) settle after mount; take the baseline once they have.
    const timer = window.setTimeout(() => { initial.current = snapshot(form); }, 400);

    function onSubmit(event) {
      const button = event.submitter;
      const kind = button?.dataset?.confirm;
      if (!kind || !COPY[kind]) return;
      if (confirmed.current) {
        confirmed.current = false;
        return;
      }
      event.preventDefault();
      pending.current = button;
      const changes = changedLabels(initial.current || {}, snapshot(form));
      setState({ kind, changes });
      dialog.current?.showModal();
    }
    form.addEventListener("submit", onSubmit);
    return () => {
      window.clearTimeout(timer);
      form.removeEventListener("submit", onSubmit);
    };
  }, []);

  function close() {
    dialog.current?.close();
    pending.current?.focus();
  }

  function go() {
    const button = pending.current;
    const form = anchor.current?.closest("form");
    dialog.current?.close();
    if (!form || !button) return;
    confirmed.current = true;
    form.requestSubmit(button);
  }

  const copy = state ? COPY[state.kind] : null;
  const nothing = state?.kind === "save" && state.changes.length === 0;

  return (
    <span ref={anchor} style={{ display: "contents" }}>
      <dialog ref={dialog} className="confirm-dialog" aria-labelledby="confirm-title">
        {copy && (
          <div className="confirm-body">
            <h2 id="confirm-title">{nothing ? "Nothing to save" : copy.title}</h2>
            {nothing ? (
              <p className="muted">You haven't changed anything since the page loaded.</p>
            ) : (
              <>
                <p className="muted">{copy.lead}</p>
                {state.changes.length > 0 && (
                  <>
                    <p className="confirm-label">What changed</p>
                    <ul className="confirm-list">
                      {state.changes.map((label) => <li key={label}>{label}</li>)}
                    </ul>
                  </>
                )}
              </>
            )}
            <div className="actions">
              {nothing ? (
                <button type="button" className="btn gold" onClick={close} autoFocus>OK</button>
              ) : (
                <>
                  <button type="button" className={`btn ${copy.tone === "ink" ? "" : copy.tone}`} onClick={go}>{copy.go}</button>
                  <button type="button" className="btn ghost" onClick={close} autoFocus>Keep editing</button>
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </span>
  );
}
