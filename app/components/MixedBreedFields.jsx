"use client";

import { useId, useState } from "react";
import BreedSelect from "./BreedSelect";
import Icon from "./Icon";
import { MAX_MIX_PARENTS, MIX_NAME_MAX, PARENT_BREEDS, encodeMix, isMixValue, parseMix, suggestMixName } from "../lib/breedMix.mjs";

/**
 * Shown under a furbaby's row once its breed is Mixed breed: the parent breeds (two, or three
 * with "Add a third breed") and the mix's name, suggested from them (breedMix.mjs) and editable.
 * The name follows the parents until the person types their own; "Use …" puts the suggestion back.
 * Everything travels in the furbaby's one breed value, so the forms and servers need nothing new.
 */
export default function MixedBreedFields({ value, onChange }) {
  // Mounted fresh each time Mixed breed is picked, so parents from an earlier pick don't linger.
  return isMixValue(value) ? <MixFields value={value} onChange={onChange} /> : null;
}

function MixFields({ value, onChange }) {
  const id = useId();
  const mix = parseMix(value);
  const [slots, setSlots] = useState(() => {
    const parents = mix?.parents || [];
    return [...parents, "", ""].slice(0, Math.max(2, parents.length));
  });
  const [name, setName] = useState(() => mix?.name || "");
  const [own, setOwn] = useState(() => Boolean(mix?.name && mix.name !== suggestMixName(mix.parents).name));

  const chosen = slots.filter(Boolean);
  const suggestion = suggestMixName(chosen);
  const save = (nextSlots, nextName, nextOwn) => {
    const parents = nextSlots.filter(Boolean);
    const shownName = nextOwn ? nextName : suggestMixName(parents).name;
    setSlots(nextSlots);
    setName(shownName);
    setOwn(nextOwn);
    onChange(encodeMix(parents, shownName));
  };
  const setParent = (i, key) => save(slots.map((k, j) => (j === i ? key : k)), name, own);
  const removeThird = () => save(slots.slice(0, 2), name, own);
  const typeName = (text) => {
    const mine = text.trim() !== "" && text.trim() !== suggestion.name;
    setName(text);
    setOwn(mine);
    onChange(encodeMix(chosen, mine ? text : suggestion.name));
  };
  const useName = (text) => save(slots, text, text !== suggestion.name);

  const hint = !chosen.length
    ? "Pick the parent breeds and we'll suggest a name."
    : suggestion.known
      ? <>This mix is usually called <b>{suggestion.name}</b>.</>
      : chosen.length === 1
        ? "Add the other parent breed if you know it."
        : "We blended the breed names. Change it if your family calls them something else.";
  const alternatives = [suggestion.name, ...suggestion.others].filter((n) => n && n !== name.trim());

  return (
    <fieldset className="breed-mix">
      <legend>Which breeds are in the mix?</legend>
      <div className="breed-mix-parents">
        {slots.map((key, i) => (
          <div key={i} className="breed-mix-parent">
            <BreedSelect label={`Parent breed ${i + 1}`} value={key} onChange={(k) => setParent(i, k)} breeds={PARENT_BREEDS} placeholder="Choose a breed" />
            {i === 2 ? <button type="button" className="breed-mix-remove" onClick={removeThird} aria-label="Remove the third breed"><Icon name="close" size={16} /></button> : null}
          </div>
        ))}
        {slots.length < MAX_MIX_PARENTS ? (
          <button type="button" className="breed-mix-add" onClick={() => setSlots([...slots, ""])}>+ Add a third breed</button>
        ) : null}
      </div>
      <label className="breed-mix-name" htmlFor={`${id}-name`}>
        <span>Mix name</span>
        <input
          id={`${id}-name`}
          type="text"
          maxLength={MIX_NAME_MAX}
          autoComplete="off"
          placeholder={chosen.length ? suggestion.name : "e.g. Labradoodle"}
          value={name}
          onChange={(e) => typeName(e.target.value)}
          onBlur={() => { if (!name.trim() && chosen.length) useName(suggestion.name); }}
          aria-describedby={`${id}-hint`}
        />
      </label>
      <p className="breed-mix-hint" id={`${id}-hint`} aria-live="polite">{hint}</p>
      {chosen.length > 1 && alternatives.length ? (
        <p className="breed-mix-others">
          <span>{own ? "Suggested:" : "Also called:"}</span>
          {alternatives.map((n) => <button key={n} type="button" onClick={() => useName(n)}>{n}</button>)}
        </p>
      ) : null}
    </fieldset>
  );
}
