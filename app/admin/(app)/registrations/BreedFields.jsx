"use client";

import { useEffect, useRef, useState } from "react";
import BreedSelect from "../../../components/BreedSelect";

const MAX_PICKERS = 10;

/**
 * Breed pickers for the admin's add/edit registration forms: one per furbaby,
 * following the form's "Furbabies attending" field as it changes (0 shows none).
 * Breeds already picked are kept if the count goes down and back up.
 */
export default function BreedFields({ initial = [], count = 1, label = null, rainbow = [], showRainbow = false }) {
  const box = useRef(null);
  const [shown, setShown] = useState(Math.min(MAX_PICKERS, Math.max(0, count)));
  const [breeds, setBreeds] = useState(() => Array.from({ length: MAX_PICKERS }, (_, i) => initial?.[i] || ""));
  // On a member's profile: which furbabies crossed the rainbow bridge.
  const [gone, setGone] = useState(() => Array.from({ length: MAX_PICKERS }, (_, i) => Boolean(rainbow?.[i])));

  useEffect(() => {
    const field = box.current?.closest("form")?.querySelector('input[name="furbabyCount"]');
    if (!field) return undefined;
    const sync = () => {
      const n = Number(field.value);
      setShown(Number.isFinite(n) ? Math.min(MAX_PICKERS, Math.max(0, Math.floor(n))) : 0);
    };
    sync();
    field.addEventListener("input", sync);
    return () => field.removeEventListener("input", sync);
  }, []);

  return (
    <div className="breed-selects" ref={box}>
      <input type="hidden" name="breedsSent" value="1" />
      {showRainbow && <input type="hidden" name="rainbowSent" value="1" />}
      {breeds.slice(0, shown).map((value, i) => (
        <div key={i} className="breed-select-row">
          <BreedSelect name={`furbabyBreed${i}`} label={label || (shown > 1 ? `Furbaby ${i + 1} breed (optional)` : "Breed (optional)")} value={value} onChange={(key) => setBreeds((list) => list.map((v, j) => (j === i ? key : v)))} />
          {showRainbow && <label className="check rainbow-check"><input type="checkbox" name={`furbabyRainbow${i}`} checked={gone[i]} onChange={(e) => setGone((list) => list.map((v, j) => (j === i ? e.target.checked : v)))} /> <span>🌈 {shown > 1 ? `Furbaby ${i + 1} crossed` : "Crossed"} the rainbow bridge</span></label>}
        </div>
      ))}
    </div>
  );
}
