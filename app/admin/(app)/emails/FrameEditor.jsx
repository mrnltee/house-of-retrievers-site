"use client";

import { useMemo, useState } from "react";
import { applyEmailFrame, DEFAULT_EMAIL_FRAME, EMAIL_FRAME_LIMITS, letterCoverEmail } from "../../../lib/emailTemplates.mjs";
import { resetEmailFrame, saveEmailFrame } from "../../emailActions";
import ConfirmButton from "../ConfirmButton";

const SAMPLE = "Dear Ana,\n\nThank you for joining us! This is how every email from HOR ends.";

/** The sign-off and footer every HOR email ends with (owner, 2026-11-04), with a live preview. */
export default function FrameEditor({ saved = null, canEdit = true }) {
  const start = { ...DEFAULT_EMAIL_FRAME, ...(saved || {}) };
  const [frame, setFrame] = useState(start);
  const changed = frame.signoff !== start.signoff || frame.footer !== start.footer;
  const html = useMemo(() => applyEmailFrame(letterCoverEmail({ subject: "Preview", cover: SAMPLE, filename: "", attached: false }), frame).html, [frame]);
  const set = (key) => (e) => setFrame((f) => ({ ...f, [key]: e.target.value }));
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0 }}>Sign-off and footer</h2>
      <p className="small muted" style={{ margin: "4px 0 12px" }}>How every email from HOR ends: confirmations, welcomes, letters and invites. Write <strong>**bold**</strong>, <em>*italic*</em> and links as [text](https://…); each line stays a line. Brand email designs use their own footer.</p>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <form action={saveEmailFrame} className="form">
          <label className="field"><span>Sign-off <small>After the message, e.g. your name and title</small></span><textarea name="signoff" rows={5} maxLength={EMAIL_FRAME_LIMITS.signoff} value={frame.signoff} onChange={set("signoff")} disabled={!canEdit} /></label>
          <label className="field"><span>Footer <small>The small print at the very bottom</small></span><textarea name="footer" rows={3} maxLength={EMAIL_FRAME_LIMITS.footer} value={frame.footer} onChange={set("footer")} disabled={!canEdit} /></label>
          {canEdit && (
            <div className="actions" style={{ flexWrap: "wrap" }}>
              <ConfirmButton className="btn dark" disabled={!changed} title="Save the sign-off and footer?" items={["Every email sent from now on ends with them", "Emails already sent are unchanged"]} yes="Yes, save">Save</ConfirmButton>
              {saved && <ConfirmButton className="btn ghost" formAction={resetEmailFrame} tone="alert" title="Go back to HOR's standard sign-off and footer?" items={["Your saved ones are replaced by the standard ones"]} yes="Yes, go back">Use the standard ones</ConfirmButton>}
              {changed && <button type="button" className="linkish" data-confirm="not-needed-read-only" onClick={() => setFrame(start)}>Undo my edits</button>}
            </div>
          )}
        </form>
        <iframe title="Email ending preview" srcDoc={html} sandbox="" style={{ width: "100%", height: 460, border: "1px solid var(--a-line)", borderRadius: 14, background: "#f5f1e6" }} />
      </div>
    </section>
  );
}
