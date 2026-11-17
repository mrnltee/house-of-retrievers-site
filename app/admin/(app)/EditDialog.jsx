"use client";

import { useEffect, useRef } from "react";
import Icon from "../../components/Icon";

/**
 * A row's edit form in a window over the page (owner, 2026-11-17), instead of a panel that opens inside a table
 * cell and pushes the table out of view. The form is rendered by the server page as children, so its fields,
 * actions and ConfirmButtons are unchanged. Esc or Close shuts it without saving; clicking outside does not,
 * so a half-typed form isn't lost by a stray click.
 */
export default function EditDialog({ label = "Edit", title, lead, buttonClass = "linkish small", defaultOpen = false, children }) {
  const dialog = useRef(null);
  // Opened by a link (e.g. ?add=1): show the window as soon as the page loads.
  // Focus goes to the heading, not the first button: opening shouldn't make Close look selected.
  function open() {
    dialog.current?.showModal();
    dialog.current?.querySelector("h2")?.focus();
  }
  useEffect(() => { if (defaultOpen && !dialog.current?.open) open(); }, [defaultOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <button type="button" className={`${buttonClass} edit-dialog-open`} data-confirm="not-needed-read-only" aria-haspopup="dialog" onClick={open}>{label}</button>
      <dialog ref={dialog} className="confirm-dialog edit-dialog" aria-label={title}>
        <div className="confirm-body">
          <div className="invite-head">
            <div>
              <h2 tabIndex={-1}>{title}</h2>
              {lead && <p className="small muted" style={{ margin: "4px 0 0" }}>{lead}</p>}
            </div>
            <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => dialog.current?.close()} aria-label="Close without saving"><Icon name="close" /> Close</button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
