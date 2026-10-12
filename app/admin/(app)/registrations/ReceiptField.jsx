"use client";

import { useState } from "react";
import { resizeImage } from "../../../lib/resizeImage";

/**
 * A receipt picture, resized in the browser (longest side 1600) and sent as
 * a data URL in the hidden `receipt` field, like the registrant's upload.
 */
export default function ReceiptField({ label = "Receipt picture", hint = "", required = false }) {
  const [state, setState] = useState({ dataUrl: "", name: "", error: "" });
  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return setState({ dataUrl: "", name: "", error: "" });
    try {
      const resized = await resizeImage(file);
      setState({ dataUrl: resized.dataUrl, name: file.name, error: "" });
    } catch {
      setState({ dataUrl: "", name: "", error: "That file didn't open as a picture. Try a PNG or JPG." });
    }
  }
  return (
    <label className="field">
      <span>{label} {hint && <small>{hint}</small>}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} required={required} />
      <input type="hidden" name="receipt" value={state.dataUrl} />
      {state.name && <small className="muted">✓ {state.name}, ready</small>}
      {state.error && <small className="danger-text">{state.error}</small>}
    </label>
  );
}
