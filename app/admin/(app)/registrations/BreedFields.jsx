"use client";

import { useState } from "react";
import BreedSelect from "../../../components/BreedSelect";

/** Breed pickers for the admin's add/edit registration forms; extra ones beyond the furbaby count are dropped on save. */
export default function BreedFields({ initial = [], count = 2, label = null }) {
  const slots = Math.max(count, (initial || []).length);
  const [breeds, setBreeds] = useState(() => Array.from({ length: slots }, (_, i) => initial?.[i] || ""));
  return (
    <div className="breed-selects">
      <input type="hidden" name="breedsSent" value="1" />
      {breeds.map((value, i) => (
        <BreedSelect key={i} name={`furbabyBreed${i}`} label={label || `Furbaby ${i + 1} breed (optional)`} value={value} onChange={(key) => setBreeds((list) => list.map((v, j) => (j === i ? key : v)))} />
      ))}
    </div>
  );
}
