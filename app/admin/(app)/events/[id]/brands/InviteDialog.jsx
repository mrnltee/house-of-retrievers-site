"use client";

import { useRef, useState } from "react";
import { fuzzyMatch, fold } from "../../../../../lib/fuzzy.mjs";
import { brandNameFrom } from "../../../../../lib/supporters.mjs";

/**
 * "+ Invite brands" in the page head: the directory picker in a dialog, with
 * search. When the search finds no brand, it offers to add it to the directory
 * (owner, 2026-11-14): `newHref` is the new-brand form for this event, the
 * typed name is added to it; `onTracker` names the brands already here, so a
 * name that's on the tracker says so instead.
 */
export default function InviteDialog({ children, newHref = "", onTracker = [] }) {
  const dialog = useRef(null);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(null);
  function search(value) {
    setQ(value);
    let visible = 0;
    dialog.current?.querySelectorAll(".tracker-pick > li").forEach((li) => {
      li.hidden = !fuzzyMatch(value, li.textContent);
      if (!li.hidden) visible += 1;
    });
    setShown(visible);
  }
  const name = brandNameFrom(q);
  const here = name && onTracker.find((n) => fold(n) === fold(name));
  const noResults = name && shown === 0;
  return (
    <>
      <button type="button" className="btn gold" data-confirm="not-needed-read-only" onClick={() => dialog.current?.showModal()}>+ Invite brands</button>
      <dialog ref={dialog} className="confirm-dialog invite-dialog" aria-labelledby="invite-title">
        <div className="confirm-body">
          <div className="invite-head">
            <h2 id="invite-title">Invite brands</h2>
            <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => dialog.current?.close()}>Close</button>
          </div>
          <input type="search" value={q} onChange={(e) => search(e.target.value)} placeholder="Search the directory…" aria-label="Search the directory" autoComplete="off" />
          <div role="status" aria-live="polite">
            {noResults && (here ? (
              <p className="small muted" style={{ margin: 0 }}>{here} is already on this tracker.</p>
            ) : newHref ? (
              <div className="empty-search">
                <p className="small muted" style={{ margin: 0 }}>No brand called “{name}” in the directory.</p>
                <p style={{ margin: "10px 0 0" }}><a className="btn gold" href={`${newHref}${newHref.includes("?") ? "&" : "?"}name=${encodeURIComponent(name)}`}>Add “{name}” as a new brand</a></p>
              </div>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>No brand called “{name}” in the directory.</p>
            ))}
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
