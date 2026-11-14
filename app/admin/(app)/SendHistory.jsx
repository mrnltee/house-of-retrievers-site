"use client";

import { useRef } from "react";

/**
 * "History (N)" under a letter's email status (owner, 2026-11-15): the full
 * send log opens in a dialog instead of growing the table row. Only used when
 * there's more than one send; `entries` are plain text, prepared by SendStatus.
 */
export default function SendHistory({ entries = [], name = "" }) {
  const dialog = useRef(null);
  const title = name ? `Email history · ${name}` : "Email history";
  return (
    <>
      <button type="button" className="linkish small send-log-open" data-confirm="not-needed-read-only" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>History ({entries.length})</button>
      <dialog ref={dialog} className="confirm-dialog send-log-dialog" aria-label={title} onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}>
        <div className="confirm-body">
          <div className="invite-head">
            <h2>{title}</h2>
            <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => dialog.current?.close()}>Close</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Newest first. {entries.length} emails.</p>
          <ol className="send-log-list">
            {entries.map((s, i) => (
              <li key={i} className="small">
                <strong>{s.status}</strong> · {s.letter}<br />
                <span className="muted">{s.line}</span>
                {s.detail && <><br /><span className="send-detail">{s.detail}</span></>}
              </li>
            ))}
          </ol>
        </div>
      </dialog>
    </>
  );
}
