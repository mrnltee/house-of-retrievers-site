"use client";

import { useId, useState } from "react";
import { MAX_AGE, humanYearsLabel } from "../lib/furbabyAge.mjs";

/**
 * A furbaby's age in years (optional; 0.5 for six months). Hovering or
 * focusing the field shows the human-years equivalent once an age is typed.
 * Controlled when `onChange` is given, else uncontrolled with `defaultValue`.
 */
export default function FurbabyAgeInput({ name, label = "Age (years)", value, defaultValue = "", onChange }) {
  const controlled = typeof onChange === "function";
  const [own, setOwn] = useState(defaultValue || "");
  const current = controlled ? value || "" : own;
  const human = humanYearsLabel(current);
  const hintId = useId();
  return (
    <label className="furbaby-age-field" data-human={human || undefined}>
      {label}
      <input
        type="number"
        name={name}
        inputMode="decimal"
        min="0.1"
        max={MAX_AGE}
        step="0.1"
        placeholder="Optional"
        value={current}
        onChange={(e) => (controlled ? onChange(e.target.value) : setOwn(e.target.value))}
        aria-describedby={human ? hintId : undefined}
      />
      {human ? <span id={hintId} className="visually-hidden">{human}</span> : null}
    </label>
  );
}
