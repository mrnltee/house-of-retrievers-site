"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkInByCode } from "../../../actions";

const MESSAGES = {
  ok: ["Checked in", "good"],
  already: ["Already checked in", "warn"],
  "not-confirmed": ["Not confirmed (waitlist or cancelled)", "alert"],
  "wrong-event": ["This QR is for a different event", "alert"],
  unknown: ["Code not found. Check it and try again.", "alert"],
  forbidden: ["Your role can't check people in", "alert"],
};

/** Pulls the 10-character code out of a scanned value (a bare code or a confirmation link). */
function codeFrom(text) {
  const match = String(text || "").toUpperCase().match(/([2-9A-HJKMNP-Z]{10})(?![2-9A-HJKMNP-Z])/);
  return match ? match[1] : "";
}

export default function Scanner({ eventId, title, confirmed, initialChecked }) {
  const video = useRef(null);
  const canvas = useRef(null);
  const busy = useRef(false);
  const lastCode = useRef({ code: "", at: 0 });
  const [camera, setCamera] = useState("off");
  const [result, setResult] = useState(null);
  const [checked, setChecked] = useState(initialChecked);
  const [manual, setManual] = useState("");

  const submit = useCallback(async (code) => {
    if (!code || busy.current) return;
    busy.current = true;
    try {
      const response = await checkInByCode(eventId, code);
      setResult(response);
      if (response.outcome === "ok") setChecked((n) => n + 1);
      if (navigator.vibrate) navigator.vibrate(response.outcome === "ok" ? 80 : [60, 60, 60]);
    } finally {
      // A short pause so one QR held in view isn't read twice.
      setTimeout(() => { busy.current = false; }, 1500);
    }
  }, [eventId]);

  useEffect(() => {
    if (camera !== "on") return undefined;
    let stream;
    let frame;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = () => {
          if (stopped) return;
          const v = video.current;
          if (v.readyState >= 2) {
            const c = canvas.current;
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            const ctx = c.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(v, 0, 0);
            const found = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
            const code = found && codeFrom(found.data);
            // The same QR stays in view for a while; read it once, not every frame.
            const now = Date.now();
            if (code && (code !== lastCode.current.code || now - lastCode.current.at > 6000)) {
              lastCode.current = { code, at: now };
              submit(code);
            }
          }
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setCamera("denied");
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [camera, submit]);

  const [label, tone] = result ? MESSAGES[result.outcome] || MESSAGES.unknown : [];

  return (
    <div className="checkin">
      <div className="checkin-top">
        <span className="tag">CHECK-IN</span>
        <h1 style={{ color: "white" }}>{title}</h1>
        <span className="muted" aria-live="polite">{checked} of {confirmed} checked in</span>
      </div>
      <div className="checkin-body">
        <div className="viewfinder">
          {camera === "on" ? (
            <>
              <video ref={video} muted playsInline aria-label="Camera view" />
              <span className="frame" aria-hidden="true" />
            </>
          ) : (
            <div className="form" style={{ justifyItems: "center" }}>
              <p>{camera === "denied" ? "The camera is blocked. Allow it in the browser, or type the code below." : "Point the camera at the QR on their confirmation."}</p>
              <button type="button" className="btn gold" onClick={() => setCamera("on")}>Start camera</button>
            </div>
          )}
          <canvas ref={canvas} hidden />
        </div>

        {result && (
          <section className="card" role="status" aria-live="assertive">
            <div className="actions" style={{ justifyContent: "space-between" }}>
              <strong style={{ fontSize: 18 }}>{result.person?.name || "—"}</strong>
              <span className={`chip ${tone}`}>{label}</span>
            </div>
            {result.person && (
              <>
                <p className="muted">{result.person.furbaby ? `With ${result.person.furbaby}` : "No furbaby listed"}{result.person.feeStatus ? ` · fee: ${result.person.feeStatus === "paid" ? "paid" : "not marked paid"}` : ""}</p>
                <div className="actions">
                  {result.person.under18 && <span className="chip warn">Under 18 · guardian: {result.person.guardian}</span>}
                  <span className={`chip ${result.person.photoConsent ? "" : "alert"}`}>{result.person.photoConsent ? "Photos OK" : "No photos"}</span>
                </div>
              </>
            )}
          </section>
        )}

        <form className="form" onSubmit={(event) => { event.preventDefault(); submit(codeFrom(manual)); setManual(""); }}>
          <label className="field">
            <span>Or type the code</span>
            <input type="text" inputMode="text" autoCapitalize="characters" autoComplete="off" value={manual} onChange={(event) => setManual(event.target.value)} placeholder="10 letters and numbers" />
          </label>
          <button className="btn ghost" type="submit">Check in</button>
        </form>
        <p className="small muted">Someone who said no to photos shows a “No photos” flag here. Let the photographers know.</p>
      </div>
    </div>
  );
}
