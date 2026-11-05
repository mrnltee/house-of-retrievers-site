"use client";

import { useEffect, useState } from "react";
import ConfirmButton from "../ConfirmButton";
import { deleteSupporters } from "../../supporterActions";

const boxes = () => [...document.querySelectorAll("input[form='brand-batch'][name='id']")];

/**
 * Brands & Partners: tick brands to delete several at once (owner, 2026-11-05).
 * Shows how many are ticked, select all / clear, and Delete selected with a confirm listing them.
 */
export default function BatchBar({ back }) {
  const [names, setNames] = useState([]);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const update = () => {
      const all = boxes();
      setTotal(all.length);
      setNames(all.filter((b) => b.checked).map((b) => b.dataset.name));
      const head = document.getElementById("brand-select-all");
      if (head) {
        const n = all.filter((b) => b.checked).length;
        head.checked = n > 0 && n === all.length;
        head.indeterminate = n > 0 && n < all.length;
      }
    };
    update();
    document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, []);
  const setAll = (on) => { boxes().forEach((b) => { b.checked = on; }); document.dispatchEvent(new Event("change")); };
  return (
    <form id="brand-batch" action={deleteSupporters} className={`selection-bar${names.length ? " is-active" : ""}`}>
      <input type="hidden" name="back" value={back} />
      {names.length ? (
        <>
          <strong>{names.length} selected</strong>
          <ConfirmButton className="btn danger small" tone="danger" title={`Delete ${names.length} record${names.length === 1 ? "" : "s"}?`} items={[...names.slice(0, 6), ...(names.length > 6 ? [`and ${names.length - 6} more`] : [])]} note="Brands on an event's Brand tracker are kept. This can't be undone." yes="Yes, delete">Delete selected</ConfirmButton>
          <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => setAll(false)}>Clear</button>
        </>
      ) : <span className="muted">Tick brands to delete several at once.</span>}
      {total > 0 && names.length < total && <button type="button" className="linkish" data-confirm="not-needed-read-only" onClick={() => setAll(true)}>Select all {total} showing</button>}
    </form>
  );
}
