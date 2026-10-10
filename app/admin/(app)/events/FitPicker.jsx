"use client";

import { IMAGE_FITS } from "../../../lib/admin/events.mjs";

/**
 * How a picture sits in the event page's frame: Fit (whole), Fill (cropped
 * to the frame) or Tile (repeated). Each option shows a tiny diagram, so the
 * choice reads at a glance.
 */
export default function FitPicker({ value, onChange, name, label = "On the event page" }) {
  return (
    <fieldset className="plain fit-picker">
      <legend className="small">{label}</legend>
      <div className="segmented small" role="radiogroup">
        {IMAGE_FITS.map(([key, text, hint]) => (
          <label key={key} className={value === key ? "is-on" : undefined} title={hint}>
            <input type="radio" name={name ? `${name}-choice` : undefined} value={key} checked={value === key} onChange={() => onChange(key)} />
            <span className={`fit-icon fit-${key}`} aria-hidden="true"><i /><i /><i /><i /></span>
            {text}
          </label>
        ))}
      </div>
      <p className="small muted">{IMAGE_FITS.find(([key]) => key === value)?.[2]}</p>
      {name && <input type="hidden" name={name} value={value} />}
    </fieldset>
  );
}
