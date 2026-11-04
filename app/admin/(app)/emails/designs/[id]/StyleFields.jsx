"use client";

import { useState } from "react";
import { fromHex, toHex } from "../../../../../lib/emailDesign.mjs";

/** A colour typed as hex, rgb(…) or hsl(…); a swatch shows it, and the format switch shows it the other ways. */
export function ColorField({ label, value = "", onChange, allowEmpty = true, disabled = false }) {
  const [format, setFormat] = useState("hex");
  const [typed, setTyped] = useState(null);
  const hex = toHex(value);
  const shown = typed ?? (hex ? fromHex(hex, format) : "");
  const bad = typed != null && typed.trim() !== "" && !toHex(typed);
  return (
    <div className="field color-field">
      <span className="field-head">{label}</span>
      <div className="color-row">
        <input type="color" value={hex || "#ffffff"} onChange={(e) => { setTyped(null); onChange(e.target.value); }} disabled={disabled} aria-label={`${label} picker`} />
        <input type="text" value={shown} placeholder={allowEmpty ? "None" : "#ffffff"} disabled={disabled} aria-invalid={bad} aria-label={`${label} value`}
          onChange={(e) => { setTyped(e.target.value); const h = toHex(e.target.value); if (h) onChange(h); else if (!e.target.value.trim() && allowEmpty) onChange(""); }}
          onBlur={() => setTyped(null)} />
        <span className="seg" role="group" aria-label="Colour format">
          {["hex", "rgb", "hsl"].map((f) => <button key={f} type="button" data-confirm="not-needed-read-only" aria-pressed={format === f} onClick={() => { setFormat(f); setTyped(null); }}>{f.toUpperCase()}</button>)}
        </span>
      </div>
      {bad && <span className="small error-text">Use #F5F1E6, rgb(245, 241, 230) or hsl(43, 46%, 93%).</span>}
    </div>
  );
}

const SIDES = ["Top", "Right", "Bottom", "Left"];

/** Four numbers (top, right, bottom, left) in px, 0–80. */
export function BoxField({ label, value, onChange, disabled = false }) {
  const v = Array.isArray(value) ? value : [0, 0, 0, 0];
  return (
    <fieldset className="field box-field" disabled={disabled}>
      <legend className="field-head">{label} <small>top · right · bottom · left (px)</small></legend>
      <div className="box-row">
        {SIDES.map((side, i) => (
          <input key={side} type="number" min={0} max={80} value={v[i] ?? 0} aria-label={`${label} ${side.toLowerCase()}`}
            onChange={(e) => { const next = [...v]; next[i] = Math.max(0, Math.min(80, Number(e.target.value) || 0)); onChange(next); }} />
        ))}
      </div>
    </fieldset>
  );
}

/** Background, padding, space around (margin) and alignment for a block or a zone. */
export default function StyleFields({ style = {}, onChange, disabled = false }) {
  const set = (key, value) => {
    const next = { ...style };
    if (value === "" || value == null) delete next[key];
    else next[key] = value;
    onChange(next);
  };
  return (
    <div className="style-fields">
      <ColorField label="Background" value={style.background || ""} onChange={(v) => set("background", v)} disabled={disabled} />
      <BoxField label="Padding" value={style.padding} onChange={(v) => set("padding", v)} disabled={disabled} />
      <BoxField label="Space around (margin)" value={style.margin} onChange={(v) => set("margin", v)} disabled={disabled} />
      <div className="field">
        <span className="field-head">Align</span>
        <span className="seg" role="group" aria-label="Align">
          {["left", "center", "right"].map((a) => <button key={a} type="button" data-confirm="not-needed-read-only" aria-pressed={(style.align || "left") === a} onClick={() => set("align", a)} disabled={disabled}>{a === "center" ? "Centre" : a[0].toUpperCase() + a.slice(1)}</button>)}
        </span>
      </div>
    </div>
  );
}
