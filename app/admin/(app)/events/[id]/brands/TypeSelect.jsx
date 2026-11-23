"use client";

import { useState } from "react";

/**
 * A brand's type at this event, set right in the tracker's Type column (owner, 23 Nov 2026): partners as
 * Co-presenter, In-kind partner or Exhibitor; sponsors by level. Save appears only once the choice changes,
 * like People's follow-up status; the ConfirmButton passed as `children` still asks before saving.
 */
export default function TypeSelect({ id, name, value, partnerTypes, sponsorLevels, children }) {
  const [now, setNow] = useState(value);
  return (
    <span className="type-select">
      <label className="visually-hidden" htmlFor={id}>{name} at this event as</label>
      <select id={id} name="role" value={now} onChange={(e) => setNow(e.target.value)}>
        <optgroup label="Partner">
          <option value="Partner">Partner · no type yet</option>
          {partnerTypes.map(([k, l]) => <option key={k} value={`Partner:${k}`}>{l}</option>)}
        </optgroup>
        <optgroup label="Sponsor">
          <option value="Sponsor">Sponsor · no level yet</option>
          {sponsorLevels.map(([k, l]) => <option key={k} value={`Sponsor:${k}`}>{l}</option>)}
        </optgroup>
      </select>
      {now !== value && <span className="person-quick-save">{children}<button type="button" className="linkish small" data-confirm="not-needed-read-only" onClick={() => setNow(value)}>Undo</button></span>}
    </span>
  );
}
