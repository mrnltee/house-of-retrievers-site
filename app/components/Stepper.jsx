/** A number field with − / + buttons on one row. */
export default function Stepper({ label, name, value, min, max, onChange }) {
  const n = Number(value) || 0;
  const set = (next) => onChange(String(Math.max(min, Math.min(max, next))));
  return (
    <label className="rsvp-stepper">{label}
      <span className="rsvp-stepper-row">
        <input required type="number" name={name} min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" />
        <button type="button" onClick={() => set(n - 1)} disabled={n <= min} aria-label={`One fewer: ${label}`}>−</button>
        <button type="button" onClick={() => set(n + 1)} disabled={n >= max} aria-label={`One more: ${label}`}>+</button>
      </span>
    </label>
  );
}
