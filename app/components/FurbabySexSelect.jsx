"use client";

import { FURBABY_SEXES, sexLabel } from "../lib/furbabySex.mjs";

/**
 * A furbaby's gender: "Not said" (default), Male or Female. A plain select so it
 * can always be cleared again, and it reads the same on every form.
 * Controlled when `onChange` is given, else uncontrolled with `defaultValue`.
 */
export default function FurbabySexSelect({ name, label = "Gender (optional)", value, defaultValue = "", onChange }) {
  const controlled = typeof onChange === "function";
  return (
    <label className="furbaby-sex-field">
      {label}
      <select
        name={name}
        {...(controlled ? { value: value || "", onChange: (e) => onChange(e.target.value) } : { defaultValue: defaultValue || "" })}
      >
        <option value="">Not said</option>
        {FURBABY_SEXES.map((key) => <option key={key} value={key}>{sexLabel(key)}</option>)}
      </select>
    </label>
  );
}
