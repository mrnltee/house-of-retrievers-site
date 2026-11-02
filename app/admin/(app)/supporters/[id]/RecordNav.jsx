"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Back link and Previous / Next for a brand page. When the brand form has unsaved
 * edits, these links ask to save first; other ways of leaving get the browser's warning.
 */
export default function RecordNav({ backHref, prev, next, here }) {
  const dirty = useRef(false);
  const leaving = useRef(false);
  const dialog = useRef(null);
  const [target, setTarget] = useState("");
  const form = () => document.querySelector(".supporter-grid > form");

  useEffect(() => {
    const f = form();
    if (!f) return undefined;
    const mark = () => { dirty.current = true; };
    const clear = () => { dirty.current = false; };
    const warn = (event) => { if (dirty.current && !leaving.current) { event.preventDefault(); event.returnValue = ""; } };
    f.addEventListener("input", mark);
    f.addEventListener("change", mark);
    f.addEventListener("submit", clear);
    window.addEventListener("beforeunload", warn);
    return () => {
      f.removeEventListener("input", mark);
      f.removeEventListener("change", mark);
      f.removeEventListener("submit", clear);
      window.removeEventListener("beforeunload", warn);
    };
  }, []);

  function guard(event) {
    if (!dirty.current) return;
    event.preventDefault();
    setTarget(event.currentTarget.getAttribute("href"));
    dialog.current?.showModal();
  }
  function saveFirst() {
    dialog.current?.close();
    const save = form()?.querySelector("button[data-confirmed-action]");
    save?.scrollIntoView({ block: "center", behavior: "smooth" });
    save?.click();
  }
  function leave() {
    leaving.current = true;
    window.location.href = target;
  }

  const step = (item, label) => item
    ? <a className="btn ghost small" href={item.href} title={item.name} onClick={guard}>{label}</a>
    : <span className="btn ghost small" aria-disabled="true">{label}</span>;

  return (
    <nav className="record-nav small" aria-label="Brands">
      <a href={backHref} onClick={guard}>← Brands & Partners</a>
      <span className="record-nav-step">
        {step(prev, "‹ Previous")}
        {here && <span className="muted">{here.n} of {here.total}</span>}
        {step(next, "Next ›")}
      </span>
      <dialog ref={dialog} className="confirm-dialog" aria-labelledby="record-nav-title">
        <div className="confirm-body">
          <h2 id="record-nav-title">Save your changes first?</h2>
          <p>You changed this brand but haven&apos;t saved. If you leave now, those changes are lost.</p>
          <div className="actions">
            <button type="button" className="btn gold" data-confirm="not-needed-read-only" onClick={saveFirst} autoFocus>Save first</button>
            <button type="button" className="btn ghost" data-confirm="not-needed-read-only" onClick={leave}>Leave without saving</button>
            <button type="button" className="btn ghost" data-confirm="not-needed-read-only" onClick={() => dialog.current?.close()}>Stay here</button>
          </div>
        </div>
      </dialog>
    </nav>
  );
}
