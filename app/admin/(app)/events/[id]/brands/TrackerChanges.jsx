"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import ConfirmButton from "../../../ConfirmButton";
import Icon from "../../../../../components/Icon";

/**
 * One Save for the whole tracker (owner, 23 Nov 2026). Row controls (reply icons, Type, Event page switch) only
 * stage a change here; the bar under the table counts them and saves them all in one go, after one confirm.
 * A change set back to what's saved drops out. Leaving the page with changes asks first.
 */
const Changes = createContext(null);

const keyOf = (row, field) => `${row}|${field}`;

export function TrackerChanges({ on = true, action, eventId, noun = "row", keeps = "notes and letters", picks = "replies", children }) {
  const [changes, setChanges] = useState({});
  const list = useMemo(() => Object.values(changes), [changes]);
  const count = list.length;

  useEffect(() => {
    if (!count) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    // Links to other admin pages (the menu, Open Registrations…) would drop the staged changes without a reload.
    const guard = (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a || e.defaultPrevented || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      if (/\/(letters\/send|supporters\/new)$/.test(url.pathname)) return; // open in a window over this page
      if (!window.confirm(`You have ${count} unsaved ${count === 1 ? "change" : "changes"} on this tracker. Leave without saving?`)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [count]);

  const api = useMemo(() => ({
    get: (row, field) => changes[keyOf(row, field)],
    set: (change) => setChanges((all) => {
      const next = { ...all };
      const k = keyOf(change.row, change.field);
      if (change.to === change.from) delete next[k];
      else next[k] = change;
      return next;
    }),
    drop: (row, field) => setChanges((all) => {
      if (!all[keyOf(row, field)]) return all;
      const next = { ...all };
      delete next[keyOf(row, field)];
      return next;
    }),
  }), [changes]);

  const rows = new Set(list.map((c) => c.name));
  const items = [
    ...list.map((c) => `${c.name} · ${c.what}: ${c.fromLabel} → ${c.toLabel}`),
    ...[...new Set(list.flatMap((c) => c.notes || []))],
    `Everything else on these rows (${keeps}) stays as it is`,
    "Nothing is emailed",
  ];

  if (!on) return children;
  return (
    <Changes.Provider value={api}>
      {children}
      <form action={action} className={`access-savebar tracker-savebar${count ? " has-changes" : ""}`} role="region" aria-label="Save changes">
        <input type="hidden" name="event" value={eventId} />
        <input type="hidden" name="changes" value={JSON.stringify(list.map(({ row, field, to }) => ({ row, field, to })))} />
        <p className="small" aria-live="polite" style={{ margin: 0 }}>
          {count
            ? <><strong>{count} unsaved {count === 1 ? "change" : "changes"}</strong> for {rows.size} {rows.size === 1 ? noun : `${noun}s`}. Changed ones are outlined in gold.</>
            : <span className="muted">No unsaved changes. Change {picks} on any row, then save them all here at once.</span>}
        </p>
        <div className="actions">
          {count > 0 && <button type="button" className="linkish" data-confirm="not-needed-read-only" onClick={() => setChanges({})}>Discard changes</button>}
          <ConfirmButton className="btn dark" disabled={!count} title={`Save ${count} ${count === 1 ? "change" : "changes"}?`} yes="Yes, save all" items={items}>
            Save{count ? ` ${count} ${count === 1 ? "change" : "changes"}` : ""}
          </ConfirmButton>
        </div>
      </form>
    </Changes.Provider>
  );
}

function useChange(row, field, saved) {
  const api = useContext(Changes);
  const pending = api?.get(row, field);
  // After a save the page comes back with new saved values: a change made from an older value is done (or
  // overtaken), so it drops out; one that failed still starts from what's saved and stays.
  const stale = Boolean(pending) && pending.from !== saved;
  useEffect(() => { if (stale) api.drop(row, field); }, [stale, api, row, field]);
  const value = pending && !stale ? pending.to : saved;
  return [value, value !== saved, api];
}

/** The reply as icon buttons: picking one stages it; the saved one is marked until the change is saved. */
export function ReplyPicker({ row, name, saved, options, what = "Reply" }) {
  const [value, changed, api] = useChange(row, "reply", saved);
  const label = (k) => options.find((o) => o.key === k)?.label || k;
  return (
    <span className={`reply-quick reply-icons${changed ? " is-changed" : ""}`} role="group" aria-label={`${name}'s reply${changed ? " (not saved yet)" : ""}`}>
      {options.map((o) => (
        <button key={o.key} type="button" data-confirm="not-needed-read-only" aria-pressed={o.key === value}
          className={`reply-opt${o.key === value ? ` is-on ${o.tone || ""}` : ""}`.trim()} title={o.key === value ? `${changed ? "Not saved yet" : "Their reply"}: ${o.label}` : `Mark ${o.label}`}
          onClick={() => api.set({ row, name, field: "reply", what, from: saved, to: o.key, fromLabel: label(saved), toLabel: o.label, notes: options.find((x) => x.key === o.key)?.notes })}>
          <Icon name={o.icon} label={o.label} />
        </button>
      ))}
    </span>
  );
}

/** A select whose change is staged for the Save bar (the Brand tracker's Type). */
export function StagedSelect({ id, row, name, field, saved, what, label, groups, notes }) {
  const [value, changed, api] = useChange(row, field, saved);
  const text = (v) => groups.flatMap((g) => g.options).find(([k]) => k === v)?.[1] || v;
  return (
    <span className={`type-select${changed ? " is-changed" : ""}`}>
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => api.set({ row, name, field, what, from: saved, to: e.target.value, fromLabel: text(saved), toLabel: text(e.target.value), notes })}>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </optgroup>
        ))}
      </select>
      {changed && <button type="button" className="linkish small" data-confirm="not-needed-read-only" onClick={() => api.set({ row, name, field, from: saved, to: saved })}>Undo</button>}
    </span>
  );
}

/** The Guest tracker's Event page switch, staged. */
export function StagedSwitch({ row, name, saved, what, onNotes, offNotes, children }) {
  const [value, changed, api] = useChange(row, "onPage", saved ? "1" : "0");
  const on = value === "1";
  return (
    <span className={`onpage-form${changed ? " is-changed" : ""}`}>
      <button type="button" role="switch" aria-checked={on} data-confirm="not-needed-read-only" className={`onpage-toggle${on ? " is-on" : ""}`}
        onClick={() => api.set({ row, name, field: "onPage", what, from: saved ? "1" : "0", to: on ? "0" : "1", fromLabel: saved ? "shown" : "not shown", toLabel: on ? "not shown" : "shown", notes: on ? offNotes : onNotes })}>
        <span className="onpage-track" aria-hidden="true" />
        <span>Event page{changed && <span className="small muted"> · not saved</span>}</span>
      </button>
      {children}
    </span>
  );
}
