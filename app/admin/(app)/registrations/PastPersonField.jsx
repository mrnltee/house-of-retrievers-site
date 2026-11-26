"use client";

import { useEffect, useId, useRef, useState } from "react";
import { findPastPeople } from "../../registrationActions";
import { breedLabel } from "../../../lib/breeds.mjs";
import { ageLabel } from "../../../lib/furbabyAge.mjs";
import { MIN_QUERY } from "../../../lib/admin/pastPeople.mjs";
import Icon from "../../../components/Icon";

const WAIT_MS = 250;
const FIELDS = ["email", "furbabyCount", "furbabyName"];

/** "Mochi (Golden Retriever, 3 yrs), Fudge" for the suggestion's second line. */
function furbabyLine(list) {
  return list.map((f) => {
    const bits = [breedLabel(f.breed), f.sex === "male" ? "male" : f.sex === "female" ? "female" : "", ageLabel(f.age)].filter(Boolean);
    return `${f.name || "Furbaby"}${bits.length ? ` (${bits.join(", ")})` : ""}`;
  }).join(", ");
}

/**
 * The Name field on Add registration, with suggestions from People and past RSVPs
 * (owner feedback, 26 Nov 2026). Picking one fills the email and furbabies; every
 * field stays editable, and Undo puts back what was there. An ARIA 1.2 combobox:
 * ↓ ↑ move, Enter picks, Esc closes, and typing on ignores the list.
 */
export default function PastPersonField({ eventId }) {
  const id = useId();
  const input = useRef(null);
  const timer = useRef(0);
  const asked = useRef(0);
  const [text, setText] = useState("");
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [filled, setFilled] = useState(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const formOf = () => input.current?.form;
  const fieldOf = (name) => formOf()?.elements.namedItem(name);

  function search(value) {
    clearTimeout(timer.current);
    if (value.trim().length < MIN_QUERY) { setList([]); setOpen(false); setBusy(false); return; }
    setBusy(true);
    timer.current = setTimeout(async () => {
      const ask = ++asked.current;
      const found = await findPastPeople(eventId, value).catch(() => []);
      if (ask !== asked.current) return;
      setList(found);
      setActive(-1);
      setOpen(true);
      setBusy(false);
    }, WAIT_MS);
  }

  function setField(name, value) {
    const el = fieldOf(name);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function pick(s) {
    const before = { name: text, ...Object.fromEntries(FIELDS.map((n) => [n, fieldOf(n)?.value ?? ""])) };
    setText(s.name);
    setOpen(false);
    setActive(-1);
    setField("email", s.email);
    if (s.furbabies.length) {
      setField("furbabyCount", String(s.furbabies.length));
      setField("furbabyName", s.furbabies.map((f) => f.name).filter(Boolean).join(", "));
      formOf()?.dispatchEvent(new CustomEvent("hor:fill-furbabies", { detail: s.furbabies }));
    }
    setFilled({ before, suggestion: s });
  }

  function undo() {
    const { before } = filled;
    setText(before.name);
    for (const name of FIELDS) setField(name, before[name]);
    formOf()?.dispatchEvent(new CustomEvent("hor:fill-furbabies", { detail: [] }));
    setFilled(null);
    input.current?.focus();
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && list.length) { setOpen(true); setActive(0); return; }
      setActive((i) => Math.min(list.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter" && open && active >= 0 && list[active]) {
      e.preventDefault();
      pick(list[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const shown = open && text.trim().length >= MIN_QUERY;
  const listId = `${id}-list`;

  return (
    <div className="field past-person">
      <label className="field-head" htmlFor={`${id}-input`}>Name <small>Type 2 letters to find someone from People or a past event</small></label>
      <div className="past-person-box">
        <input
          ref={input}
          id={`${id}-input`}
          type="text"
          name="name"
          required
          maxLength={120}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shown}
          aria-controls={listId}
          aria-activedescendant={shown && active >= 0 ? `${id}-opt-${active}` : undefined}
          value={text}
          onChange={(e) => { setText(e.target.value); search(e.target.value); }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => { if (list.length && text.trim().length >= MIN_QUERY) setOpen(true); }}
        />
        {shown && (
          <ul className="past-person-list" id={listId} role="listbox" aria-label="People with that name">
            {list.length === 0 && <li className="past-person-empty" role="presentation">Nobody by that name yet. Type their details below.</li>}
            {list.map((s, i) => (
              <li
                key={s.key}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "is-active" : ""}
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                onMouseMove={() => setActive(i)}
              >
                <span className="past-person-name">{s.name} <span className={`reg-people${s.tone ? ` is-${s.tone}` : ""}`}>· {s.label}</span></span>
                <span className="past-person-meta">{s.email}{s.detail ? ` · ${s.detail}` : ""}</span>
                {s.furbabies.length > 0 && <span className="past-person-meta"><Icon name="paw" /> {furbabyLine(s.furbabies)}</span>}
                {s.here && <span className="past-person-here">Already registered for this event</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{busy ? "" : shown ? (list.length ? `${list.length} ${list.length === 1 ? "match" : "matches"}. Use the arrow keys to choose.` : "No matches.") : ""}</p>
      {filled && (
        <p className="past-person-filled small" role="status">
          <Icon name="check" /> Filled in from their records: email{filled.suggestion.furbabies.length ? ` and ${filled.suggestion.furbabies.length === 1 ? "furbaby" : `${filled.suggestion.furbabies.length} furbabies`}` : ""}. Check them before adding.
          {" "}<button type="button" className="linkish" onClick={undo}>Undo</button>
        </p>
      )}
    </div>
  );
}
