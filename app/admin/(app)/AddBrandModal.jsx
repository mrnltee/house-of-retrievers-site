"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openNewBrand } from "../supporterActions";
import SupporterForm from "./supporters/SupporterForm";
import HowTo from "./HowTo";
import Icon from "../../components/Icon";

/**
 * The Add brand window (owner, 2026-11-15). Links to /supporters/new anywhere
 * in the admin (the directory's button, an event's Invite brands, a search with
 * no results) open the same form in a window over the page instead of leaving
 * it. Saving lands where the full page would: the new brand, or the event's
 * Brand tracker when it was added from one. Ctrl/⌘-click or opening the link
 * directly still gives the full page.
 */
export default function AddBrandModal({ base = "" }) {
  const dialog = useRef(null);
  const [state, setState] = useState(null); // { query, loading, data, error }
  const newPath = `${base}/supporters/new`;

  const open = useCallback(async (query) => {
    // Another window (Invite brands) closes first, so this one isn't stacked behind it.
    document.querySelectorAll("dialog[open]").forEach((d) => { if (d !== dialog.current) d.close(); });
    setState({ query, loading: true });
    try {
      const data = await openNewBrand(query);
      setState(data?.ok ? { query, data } : { query, error: data?.error || "The Add brand window couldn't open." });
    } catch {
      setState({ query, error: "The Add brand window couldn't open. Check your connection and try again." });
    }
  }, []);

  useEffect(() => {
    if (window.location.pathname === newPath) return undefined; // The full page is already here.
    function onClick(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== newPath) return;
      event.preventDefault();
      open(url.search);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open, newPath]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (state && !d.open) d.showModal();
    if (!state && d.open) d.close();
    document.documentElement.classList.toggle("send-modal-open", Boolean(state));
  }, [state]);

  const close = () => setState(null);
  const data = state?.data;
  const event = data?.prefill?.event;

  return (
    <dialog ref={dialog} className="send-modal brand-modal" aria-labelledby="brand-modal-title" onCancel={(e) => { e.preventDefault(); close(); }} onClose={() => state && close()}>
      <div className="send-modal-head">
        <h2 id="brand-modal-title">Add a brand</h2>
        <HowTo guide="add-brand" />
        {state?.query !== undefined && <a className="small" href={`${newPath}${state.query || ""}`} target="_blank" rel="noreferrer">Open as a page <Icon name="external" /></a>}
        <button type="button" className="btn ghost small" onClick={close} aria-label="Close the Add brand window" data-confirm="not-needed-read-only"><Icon name="close" /> Close</button>
      </div>
      <div className="send-modal-body">
        {state?.loading && <p className="muted" role="status">Opening the form…</p>}
        {state?.error && <p className="card" role="alert">{state.error}</p>}
        {data && (
          <>
            <p className="muted" style={{ margin: "0 0 14px" }}>{event ? `Start with the name and type; it goes on ${event.title}'s Brand tracker when you create it.` : "Start with the name and type; the rest can wait until they're confirmed."}</p>
            <SupporterForm key={state.query} row={null} events={data.events} prefill={data.prefill} />
          </>
        )}
      </div>
    </dialog>
  );
}
