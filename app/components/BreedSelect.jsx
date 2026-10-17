"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BREEDS, breedIcon, breedLabel } from "../lib/breeds.mjs";

const OPTIONS = [{ key: "", label: "Choose a breed (optional)", icon: false }, ...BREEDS];

/**
 * A breed picker with each breed's icon. A native select can't show icons, so
 * this is a listbox: Enter, Space or the arrows open it; arrows, Home/End and
 * typing a letter move; Enter or Space picks; Escape or Tab closes.
 * The chosen key travels in a hidden input named `name`.
 */
export default function BreedSelect({ name, label, value = "", onChange }) {
  const id = useId();
  const button = useRef(null);
  const list = useRef(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = Math.max(0, OPTIONS.findIndex((o) => o.key === value));

  useEffect(() => {
    if (!open) return undefined;
    list.current?.focus();
    const close = (event) => { if (!list.current?.contains(event.target) && !button.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function show(index = selected) { setActive(index); setOpen(true); }
  function pick(index) {
    onChange?.(OPTIONS[index].key);
    setOpen(false);
    button.current?.focus();
  }
  function onButtonKey(event) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); show(); }
  }
  function onListKey(event) {
    const last = OPTIONS.length - 1;
    const keys = { ArrowDown: Math.min(last, active + 1), ArrowUp: Math.max(0, active - 1), Home: 0, End: last, PageDown: Math.min(last, active + 5), PageUp: Math.max(0, active - 5) };
    if (event.key in keys) { event.preventDefault(); setActive(keys[event.key]); return; }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pick(active); return; }
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); button.current?.focus(); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key.length === 1 && /\S/.test(event.key)) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + event.key.toLowerCase(), at: now };
      const match = OPTIONS.findIndex((o, i) => i > 0 && o.label.toLowerCase().startsWith(typed.current.text));
      if (match >= 0) setActive(match);
    }
  }

  const icon = breedIcon(value);
  return (
    <div className="breed-select">
      <span className="breed-select-label" id={`${id}-label`}>{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={button}
        type="button"
        className="breed-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onButtonKey}
      >
        <span className="breed-select-icon" aria-hidden="true">{icon ? <img src={icon} alt="" width={28} height={28} /> : null}</span>
        <span id={`${id}-value`} className={value ? "" : "breed-select-placeholder"}>{value ? breedLabel(value) : OPTIONS[0].label}</span>
        <span className="breed-select-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul
          ref={list}
          className="breed-select-list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onListKey}
        >
          {OPTIONS.map((option, index) => (
            <li
              key={option.key || "none"}
              id={`${id}-opt-${index}`}
              data-index={index}
              role="option"
              aria-selected={index === selected}
              className={`${index === active ? "is-active" : ""}${index === selected ? " is-selected" : ""}`}
              onPointerEnter={() => setActive(index)}
              onClick={() => pick(index)}
            >
              <span className="breed-select-icon" aria-hidden="true">{option.icon ? <img src={breedIcon(option.key)} alt="" width={28} height={28} loading="lazy" /> : null}</span>
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
