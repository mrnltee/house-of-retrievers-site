"use client";

import { useId, useRef, useState } from "react";
import Icon from "../../../../../components/Icon";

/**
 * View a donor's returned form or proofs of payment in a window over the donor table (owner, 22 Nov 2026):
 * a PDF in the browser's own viewer, a screenshot as a picture; several files step with ‹ › or the arrow
 * keys. Open in a new tab and Download are there too. Files come from /<path>/<id> (admins only): donation forms
 * and proofs (donations/file), ledger receipts (ledger/file).
 */
export default function FileViewer({ files = [], base, title, label = "View", buttonClass = "btn small ghost", path = "donations/file" }) {
  const dialog = useRef(null);
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState(false); // files load only once the window opens
  const titleId = useId();
  if (!files.length) return null;
  const file = files[Math.min(at, files.length - 1)];
  const url = `${base}/${path}/${file.id}`;
  const step = (by) => setAt((i) => (i + by + files.length) % files.length);
  return (
    <>
      <button type="button" className={buttonClass} data-confirm="not-needed-read-only" aria-haspopup="dialog" onClick={() => { setAt(0); setOpen(true); dialog.current?.showModal(); }}>{label}</button>
      <dialog
        ref={dialog}
        className="confirm-dialog file-viewer"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onKeyDown={(e) => {
          if (files.length < 2 || e.target.closest?.("object")) return;
          if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
        }}
      >
        <div className="file-viewer-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            <p className="small muted" style={{ margin: 0 }}>{file.name}{files.length > 1 ? ` · ${Math.min(at, files.length - 1) + 1} of ${files.length}` : ""}</p>
          </div>
          <div className="file-viewer-actions">
            {files.length > 1 && (
              <>
                <button type="button" className="btn small ghost" data-confirm="not-needed-read-only" onClick={() => step(-1)} aria-label="Previous file"><Icon name="chevronLeft" /></button>
                <button type="button" className="btn small ghost" data-confirm="not-needed-read-only" onClick={() => step(1)} aria-label="Next file"><Icon name="chevronRight" /></button>
              </>
            )}
            <a className="btn small ghost" href={url} target="_blank" rel="noopener noreferrer">Open in a new tab <Icon name="external" /></a>
            <a className="btn small ghost" href={`${url}?download=1`}>Download <Icon name="download" /></a>
            <button type="button" className="btn small ghost" data-confirm="not-needed-read-only" onClick={() => dialog.current?.close()}><Icon name="close" /> Close</button>
          </div>
        </div>
        <div className="file-viewer-body">
          {open && (file.mime === "application/pdf"
            // <object> shows the fallback where a browser can't display PDFs in a page (Android phones).
            ? (
              <object key={file.id} data={url} type="application/pdf" aria-label={`${title}: ${file.name}`}>
                <div className="file-viewer-pdf-fallback">
                  <p className="small muted" style={{ margin: 0 }}>This browser can&apos;t show the PDF here.</p>
                  <a className="btn dark" href={url} target="_blank" rel="noopener noreferrer">Open the form <Icon name="external" /></a>
                </div>
              </object>
            )
            : <img key={file.id} src={url} alt={`${title}: ${file.name}`} />)}
        </div>
      </dialog>
    </>
  );
}
