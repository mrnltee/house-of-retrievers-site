"use client";

import { useEffect, useState } from "react";

/**
 * Search-as-you-type for the admin directories (Brands & Partners, Beneficiaries; design review, 17 Nov 2026),
 * like the trackers: hides cards or rows whose data-find doesn't hold every word. An optional select (a label or
 * type) applies at once. Enter still submits the form (no JavaScript). When nothing matches it can offer to add
 * the name as a new record (`newHref` gets ?name=…).
 */
export default function ListSearch({ q = "", action, hidden = {}, placeholder = "Search…", select = null, newHref = "", addNoun = "new record" }) {
  const [text, setText] = useState(q);
  const [shown, setShown] = useState(null);
  useEffect(() => {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    document.querySelectorAll("[data-find]").forEach((el) => {
      const hit = words.every((w) => (el.dataset.find || "").includes(w));
      el.hidden = !hit;
      if (hit) n += 1;
    });
    // A section (data-find-group) hides when nothing in it matches, so no heading sits over an empty list.
    document.querySelectorAll("[data-find-group]").forEach((group) => {
      group.hidden = ![...group.querySelectorAll("[data-find]")].some((el) => !el.hidden);
    });
    setShown(words.length ? n : null);
    document.dispatchEvent(new Event("tracker:filtered"));
  }, [text]);
  const name = text.trim().slice(0, 80);
  const addHref = newHref && name ? `${newHref}${newHref.includes("?") ? "&" : "?"}${new URLSearchParams({ name })}` : "";
  return (
    <form method="get" action={action} className="brand-search" role="search">
      {Object.entries(hidden).filter(([, v]) => v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label className="tracker-search">
        <span className="sr-only">Search</span>
        <input type="search" name="q" value={text} onChange={(e) => setText(e.target.value)} maxLength={80} placeholder={placeholder} autoComplete="off" />
      </label>
      {select && select.options.length > 0 && (
        <label className="tracker-sort">
          <span className="sr-only">{select.label}</span>
          <select name={select.name} defaultValue={select.value || ""} onChange={(e) => e.target.form.requestSubmit()}>
            <option value="">{select.all}</option>
            {select.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      )}
      <p className="small muted brand-search-note" aria-live="polite">
        {shown === 0 ? <>Nothing matches “{name}”.{addHref && <> <a href={addHref}>Add “{name}” as a {addNoun}</a></>}</> : shown != null ? `Showing ${shown}.` : ""}
      </p>
    </form>
  );
}
