"use client";

import { useState } from "react";

/**
 * Logo size on the website: a slider with a live preview of the circle the
 * logo sits in (home page and event pages). Bigger fills the circle (crops the
 * edges); smaller leaves room around a wide logo.
 */
export default function LogoScaleField({ logo, value = 100 }) {
  const [scale, setScale] = useState(Number(value) || 100);
  return (
    <div className="field logo-scale-field">
      <span>Logo size on the website <small>Logos sit inside a circle. Make it bigger to fill the circle, or smaller so a wide logo isn&apos;t cut off.</small></span>
      <div className="logo-scale-row">
        <span className="logo-scale-preview" aria-hidden="true">
          {logo ? <img src={logo} alt="" style={{ transform: `scale(${scale / 100})` }} /> : <span className="small muted">No logo yet</span>}
        </span>
        <input type="range" name="logoScale" min={50} max={200} step={5} value={scale} onChange={(e) => setScale(Number(e.target.value))} aria-label="Logo size" />
        <output className="small">{scale}%</output>
        {scale !== 100 && <button type="button" className="btn ghost small" onClick={() => setScale(100)}>Reset</button>}
      </div>
    </div>
  );
}
