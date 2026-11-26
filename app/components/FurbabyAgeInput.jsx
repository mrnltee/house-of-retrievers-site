"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_AGE, ageFromParts, ageParts, humanYearsLabel, readAge } from "../lib/furbabyAge.mjs";

/**
 * A furbaby's age (optional): a number and Years or Months, so a puppy under a
 * year can be "5 months" instead of "0.4". The age is always kept in years
 * (`ageFromParts`): that is what `onChange` gets and what the hidden `name`
 * input posts, so saved ages and the servers are unchanged. A saved age under
 * a year opens in months. Hovering or focusing shows the human-years
 * equivalent once an age is typed.
 * Controlled when `onChange` is given, else uncontrolled with `defaultValue`.
 */
export default function FurbabyAgeInput({ name, label = "Age", value, defaultValue = "", onChange }) {
  const controlled = typeof onChange === "function";
  const start = controlled ? value : defaultValue;
  const [parts, setParts] = useState(() => ageParts(start));
  // Untouched, a saved age posts back exactly as it was (an old "0.3" stays 0.3, not 4 months' 0.33).
  const [touched, setTouched] = useState(false);
  const years = touched ? ageFromParts(parts.amount, parts.unit) : String(readAge(start) ?? "");
  // Follow a value changed from outside (not one this field just sent up).
  const sent = useRef(ageFromParts(parts.amount, parts.unit));
  useEffect(() => {
    if (!controlled) return;
    const incoming = String(value ?? "");
    if (incoming !== sent.current) { sent.current = incoming; setParts(ageParts(incoming)); }
  }, [controlled, value]);

  const update = (next) => {
    setParts(next);
    setTouched(true);
    const out = ageFromParts(next.amount, next.unit);
    sent.current = out;
    if (controlled) onChange(out);
  };

  const months = parts.unit === "months";
  const one = Number(parts.amount) === 1;
  const human = humanYearsLabel(years);
  const id = useId();
  return (
    <div className="furbaby-age-field" data-human={human || undefined}>
      <label htmlFor={`${id}-n`}>{label}</label>
      <div className="furbaby-age-box">
        <input
          id={`${id}-n`}
          type="number"
          inputMode={months ? "numeric" : "decimal"}
          min={months ? 1 : 0.1}
          max={months ? MAX_AGE * 12 : MAX_AGE}
          step={months ? 1 : 0.1}
          value={parts.amount}
          onChange={(e) => update({ ...parts, amount: e.target.value })}
          aria-describedby={human ? `${id}-h` : undefined}
        />
        <select aria-label={`${label}: years or months`} value={parts.unit} onChange={(e) => update({ ...parts, unit: e.target.value })}>
          <option value="years">{one ? "year" : "years"}</option>
          <option value="months">{one ? "month" : "months"}</option>
        </select>
      </div>
      {name ? <input type="hidden" name={name} value={years} /> : null}
      {human ? <span id={`${id}-h`} className="visually-hidden">{human}</span> : null}
    </div>
  );
}
