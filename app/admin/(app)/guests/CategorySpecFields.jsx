"use client";

import { useState } from "react";
import { CONTACT_CATEGORIES, CONTACT_LIMITS, GUEST_SPECIFICATIONS, categoryForSpecification, categoryOf } from "../../../lib/contacts.mjs";

/**
 * Category + Guest specification (owner, 18 Nov 2026). Typing or picking a known specification picks the
 * category when none is chosen yet (Keynote Speaker → Guest speakers & hosts, Event Organizer → Event organizers
 * & co-hosts); when the chosen category doesn't match, it offers the usual one instead of changing it.
 * The specification suggestions list the chosen category's first.
 */
export default function CategorySpecFields({ category: start = "", specification: startSpec = "", name }) {
  const [category, setCategory] = useState(start);
  const [spec, setSpec] = useState(startSpec);
  const [auto, setAuto] = useState(false);
  const suggested = categoryForSpecification(spec);
  const onSpec = (value) => {
    setSpec(value);
    const next = categoryForSpecification(value);
    if (next && (!category || auto)) { setCategory(next); setAuto(true); }
  };
  const specs = [...GUEST_SPECIFICATIONS].sort((a, b) => (b.category === category) - (a.category === category));
  return (
    <>
      <div className="row-2">
        <label className="field"><span>Category <small>Picks the letter. A known specification picks it for you</small></span>
          <select name="category" value={category} onChange={(e) => { setCategory(e.target.value); setAuto(false); }}>
            <option value="">Choose…</option>
            {CONTACT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {auto && suggested && <small className="spec-note">Picked from the specification.</small>}
          {!auto && suggested && category && suggested !== category && (
            <small className="spec-note">“{spec.trim()}” is usually <strong>{categoryOf(suggested)?.label}</strong>. <button type="button" className="linkish" data-confirm="not-needed-read-only" onClick={() => { setCategory(suggested); setAuto(true); }}>Use that</button></small>
          )}
        </label>
        {name}
      </div>
      <label className="field"><span>Guest specification <small>Optional. Pick one or type your own, e.g. Keynote Speaker, Petfluencer. Shown beside their name on an event page they're on</small></span>
        <input name="specification" list="guest-specifications" value={spec} onChange={(e) => onSpec(e.target.value)} maxLength={CONTACT_LIMITS.specification} autoComplete="off" />
        <datalist id="guest-specifications">{specs.map((s) => <option key={s.label} value={s.label} label={categoryOf(s.category)?.label} />)}</datalist>
      </label>
    </>
  );
}
