"use client";

import { useEffect, useState } from "react";
import Icon from "../../components/Icon";

/**
 * Choose which columns a table shows (owner, 22 Nov 2026; first on an event's donor list). Cells carry
 * data-col="<key>"; a hidden column is hidden by a style rule scoped to the table's id, so rows the server
 * re-renders keep the choice. Saved per device (localStorage), like the appearance setting, never synced.
 * A pop-menu, so it closes like every other admin menu.
 *
 * @param {{ table: string, storageKey: string, columns: {key: string, label: string, on: boolean}[] }} props
 */
export default function ColumnPicker({ table, storageKey, columns }) {
  const defaults = Object.fromEntries(columns.map((c) => [c.key, c.on]));
  const [shown, setShown] = useState(defaults);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && typeof saved === "object") setShown({ ...defaults, ...Object.fromEntries(Object.entries(saved).filter(([k]) => k in defaults).map(([k, v]) => [k, Boolean(v)])) });
    } catch { /* keep the defaults */ }
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(next) {
    setShown(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* private mode: still applies now */ }
  }

  const hidden = columns.filter((c) => !shown[c.key]);
  const css = hidden.map((c) => `#${table} [data-col="${c.key}"]{display:none}`).join("");
  const count = columns.length - hidden.length;
  return (
    <>
      {css && <style>{css}</style>}
      <details className="head-more pop-menu column-picker">
        <summary className="btn small ghost">Columns · {count} of {columns.length} <Icon name="chevronDown" /></summary>
        <div className="head-more-menu column-picker-menu">
          <fieldset>
            <legend className="small muted">Show these columns</legend>
            {columns.map((c) => (
              <label key={c.key} className="check">
                <input type="checkbox" checked={Boolean(shown[c.key])} onChange={(e) => update({ ...shown, [c.key]: e.target.checked })} />
                <span>{c.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="column-picker-foot">
            <button type="button" className="linkish small" data-confirm="not-needed-read-only" onClick={() => update(Object.fromEntries(columns.map((c) => [c.key, true])))}>Show all</button>
            <button type="button" className="linkish small" data-confirm="not-needed-read-only" onClick={() => update(defaults)}>Back to the usual</button>
          </div>
        </div>
      </details>
    </>
  );
}
