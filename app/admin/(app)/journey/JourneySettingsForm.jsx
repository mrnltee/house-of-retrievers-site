"use client";

import { useState } from "react";
import { saveJourneySettings } from "../../journeyActions";
import ConfirmButton from "../ConfirmButton";
import { formatWhen } from "../ui";

const LAYOUTS = [
  ["vertical", "Vertical", "One centre line, cards alternating left and right as the visitor scrolls down."],
  ["horizontal", "Horizontal", "One row the visitor scrolls sideways through, oldest to newest."],
];

/** "On the home page": whether the section shows and its layout (design review, 17 Nov 2026: below the stops, layout as two tiles). */
export default function JourneySettingsForm({ settings, updatedAt, updatedBy }) {
  const [show, setShow] = useState(settings.show);
  const [orientation, setOrientation] = useState(settings.orientation);
  const changed = show !== settings.show || orientation !== settings.orientation;

  return (
    <form action={saveJourneySettings} className="card jt-settings" aria-labelledby="jt-settings-h">
      <div className="jt-settings-head">
        <h2 id="jt-settings-h">On the home page</h2>
        {updatedAt && <small className="muted">Last changed by {updatedBy || "HoR"} · {formatWhen(updatedAt)}</small>}
      </div>
      <label className="switch">
        <input type="checkbox" name="show" checked={show} onChange={(event) => setShow(event.target.checked)} />
        <span>
          <strong>Show “Our journey” on the website</strong>
          <small>{show ? "Visitors see the published stops." : "The whole section is hidden from the home page."}</small>
        </span>
      </label>

      <fieldset className="jt-layouts" style={{ opacity: show ? 1 : 0.55 }}>
        <legend>Layout{!show && <small className="muted"> · kept for when it's shown again</small>}</legend>
        {LAYOUTS.map(([value, label, help]) => (
          <label key={value} className={`jt-layout${orientation === value ? " is-on" : ""}`}>
            <input type="radio" name="orientation" value={value} checked={orientation === value} onChange={() => setOrientation(value)} />
            <span aria-hidden="true" className={`jt-layout-art ${value}`}><i /><i /><i /></span>
            <span><strong>{label}</strong><small className="muted">{help}</small></span>
          </label>
        ))}
      </fieldset>

      <div className="actions">
        <ConfirmButton
          className="btn gold"
          disabled={!changed}
          title="Save the home page settings?"
          items={[
            show ? "“Our journey” shows on the home page." : "“Our journey” is hidden from the home page.",
            `Layout: ${orientation === "horizontal" ? "horizontal (scrolls sideways)" : "vertical (alternating left/right)"}.`,
          ]}
          yes="Save"
        >
          Save
        </ConfirmButton>
        {changed && <button type="button" className="linkish" data-confirm="not-needed-read-only" onClick={() => { setShow(settings.show); setOrientation(settings.orientation); }}>Undo</button>}
        {!changed && <small className="muted">Change a setting to save it.</small>}
      </div>
    </form>
  );
}
