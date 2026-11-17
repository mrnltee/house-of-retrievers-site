"use client";

import { useEffect, useState } from "react";

/**
 * Brands & Partners search (design review, 17 Nov 2026): filters the cards or rows as you type, like the
 * trackers; a relationship label applies at once. Enter still submits the form (no JavaScript, or a name to
 * add). When nothing matches, it offers to add the name as a new brand.
 */
export default function BrandSearch({ q = "", label = "", labels = [], kind = "", view = "cards", action, newHref = "" }) {
  const [text, setText] = useState(q);
  const [shown, setShown] = useState(null);
  useEffect(() => {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    const items = document.querySelectorAll("[data-brand]");
    items.forEach((el) => {
      const hit = words.every((w) => (el.dataset.brand || "").includes(w));
      el.hidden = !hit;
      if (hit) n += 1;
    });
    setShown(words.length ? n : null);
  }, [text]);
  const addHref = newHref && text.trim() ? `${newHref}${newHref.includes("?") ? "&" : "?"}${new URLSearchParams({ name: text.trim().slice(0, 80), ...(kind ? { kind } : {}) })}` : "";
  return (
    <form method="get" action={action} className="brand-search" role="search">
      {kind && <input type="hidden" name="kind" value={kind} />}
      {view === "list" && <input type="hidden" name="view" value="list" />}
      <label className="tracker-search">
        <span className="sr-only">Find a brand</span>
        <input type="search" name="q" value={text} onChange={(e) => setText(e.target.value)} maxLength={80} placeholder="Find a brand by name, ID, label or contact…" autoComplete="off" />
      </label>
      {labels.length > 0 && (
        <label className="tracker-sort">
          <span className="sr-only">Relationship label</span>
          <select name="label" defaultValue={label} onChange={(e) => e.target.form.requestSubmit()}>
            <option value="">All labels</option>
            {labels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
      )}
      <p className="small muted brand-search-note" aria-live="polite">
        {shown === 0 ? <>No brand matches “{text.trim()}”.{addHref && <> <a href={addHref}>Add “{text.trim()}” as a new brand</a></>}</> : shown != null ? `Showing ${shown}.` : ""}
      </p>
    </form>
  );
}
