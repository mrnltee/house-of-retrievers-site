"use client";

import { useState } from "react";
import { suggestCode } from "../../../lib/supporters.mjs";

/** Name and four-letter ID stay in step until an admin edits the suggestion. */
export default function SupporterIdentityFields({ initialName = "", initialCode = "", numbered = false }) {
  const legacyCode = /^[A-Z]{3}$/.test(initialCode) ? initialCode : "";
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState(/^[A-Z]{4}$/.test(initialCode) ? initialCode : suggestCode(initialName));
  const [automatic, setAutomatic] = useState(!/^[A-Z]{4}$/.test(initialCode));
  const locked = numbered && /^[A-Z]{4}$/.test(initialCode);

  function changeName(event) {
    const next = event.target.value;
    setName(next);
    if (automatic && !locked) setCode(suggestCode(next));
  }

  function changeCode(event) {
    setAutomatic(false);
    setCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4));
  }

  return (
    <div className="row-2 supporter-identity-fields">
      <label className="field">
        <span>Name</span>
        <input type="text" name="name" required maxLength={80} value={name} onChange={changeName} />
      </label>
      <label className="field">
        <span>ID code <small>4 letters; their number reads HOR-{code || "XXXX"}-YY-NNNN</small></span>
        <input
          type="text"
          name="code"
          maxLength={4}
          pattern="[A-Za-z]{4}"
          value={code}
          onChange={changeCode}
          readOnly={locked}
          required
          placeholder="e.g. NVTL"
          aria-describedby={legacyCode ? "supporter-legacy-code" : undefined}
          style={{ textTransform: "uppercase" }}
        />
        {legacyCode && <small id="supporter-legacy-code" className="muted">Current ID: {legacyCode}. Saving replaces it with this four-letter code; you can adjust it first.</small>}
      </label>
    </div>
  );
}
