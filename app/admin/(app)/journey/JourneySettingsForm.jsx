"use client";

import { useState } from "react";
import { saveJourneySettings } from "../../journeyActions";
import ConfirmButton from "../ConfirmButton";
import { formatWhen } from "../ui";

export default function JourneySettingsForm({ settings, updatedAt, updatedBy }) {
  const [show, setShow] = useState(settings.show);
  const [orientation, setOrientation] = useState(settings.orientation);

  return (
    <form action={saveJourneySettings} className="card" style={{ display: "grid", gap: 20, maxWidth: 560 }}>
      <label className="switch">
        <input type="checkbox" name="show" checked={show} onChange={(event) => setShow(event.target.checked)} />
        <span>
          <strong>Show on the website</strong>
          <small>When off, "Our journey" is hidden from the homepage entirely.</small>
        </span>
      </label>

      <fieldset style={{ border: 0, padding: 0, margin: 0, opacity: show ? 1 : 0.5 }}>
        <legend className="field-legend" style={{ fontWeight: 700, marginBottom: 8 }}>Layout{!show && <small className="muted"> (kept for when it's shown again)</small>}</legend>
        <div style={{ display: "grid", gap: 10 }}>
          <label className="field-radio" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input type="radio" name="orientation" value="vertical" checked={orientation === "vertical"} onChange={() => setOrientation("vertical")} />
            <span><strong>Vertical</strong><br /><small className="muted">One centre line, cards alternating left and right as the visitor scrolls down.</small></span>
          </label>
          <label className="field-radio" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input type="radio" name="orientation" value="horizontal" checked={orientation === "horizontal"} onChange={() => setOrientation("horizontal")} />
            <span><strong>Horizontal</strong><br /><small className="muted">One row the visitor scrolls sideways through, oldest to newest.</small></span>
          </label>
        </div>
      </fieldset>

      <div className="actions">
        <ConfirmButton
          className="btn gold"
          title="Save journey timeline settings?"
          items={[
            show ? "“Our journey” stays visible on the homepage." : "“Our journey” is hidden from the homepage.",
            `Layout: ${orientation === "horizontal" ? "horizontal (scrolls sideways)" : "vertical (alternating left/right)"}.`,
          ]}
          yes="Save"
        >
          Save
        </ConfirmButton>
        {updatedAt && <small className="muted">Last updated by {updatedBy || "HOR"} · {formatWhen(updatedAt)}</small>}
      </div>
    </form>
  );
}
