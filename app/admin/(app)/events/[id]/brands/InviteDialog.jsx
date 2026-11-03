"use client";

import { useRef, useState } from "react";
import { fuzzyMatch } from "../../../../../lib/fuzzy.mjs";

/** "+ Invite brands" in the page head: the directory picker in a dialog, with search. */
export default function InviteDialog({ children }) {
  const dialog = useRef(null);
  const [q, setQ] = useState("");
  function search(value) {
    setQ(value);
    dialog.current?.querySelectorAll(".tracker-pick > li").forEach((li) => { li.hidden = !fuzzyMatch(value, li.textContent); });
  }
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
          {children}
        </div>
      </dialog>
    </>
  );
}
