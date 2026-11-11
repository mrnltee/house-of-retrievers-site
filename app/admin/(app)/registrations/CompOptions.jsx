import { COMP_TYPES, compValue } from "../../../lib/compTickets.mjs";

/** The complimentary choices in an admin ticket select (owner, 2026-11-11): no fee, outside capacity. */
export default function CompOptions() {
  return (
    <optgroup label="Complimentary (no fee)">
      {COMP_TYPES.map((t) => <option key={t.key} value={compValue(t.key)}>{t.label} · {t.hint}</option>)}
    </optgroup>
  );
}
