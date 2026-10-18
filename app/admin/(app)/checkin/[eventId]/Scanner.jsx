"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkInByCode, checkedInList } from "../../../actions";
import { WELCOME_COUNTDOWN_SECONDS } from "../../../../lib/manualCheckIn.mjs";
import { welcomeMessageLine } from "../../../../lib/welcomePhoto.mjs";
import ConfirmButton from "../../ConfirmButton";

const MESSAGES = {
  ok: ["Checked in", "good"],
  already: ["Already checked in", "warn"],
  "not-confirmed": ["Not confirmed (waitlist or cancelled)", "alert"],
  unpaid: ["Payment not confirmed", "alert"],
  "consent-required": ["Acknowledgement needed", "alert"],
  "wrong-event": ["This QR is for a different event", "alert"],
  unknown: ["Code not found. Check it and try again.", "alert"],
  forbidden: ["Your role can't check people in", "alert"],
};

const FEE_TEXT = { paid: "paid", waiting: "no proof uploaded yet", review: "receipt waiting to be checked", rejected: "new receipt asked", not_due: "no fee" };

/** Pulls the 10-character code out of a scanned value (a bare code or a confirmation link). */
function codeFrom(text) {
  const match = String(text || "").toUpperCase().match(/([2-9A-HJKMNP-Z]{10})(?![2-9A-HJKMNP-Z])/);
  return match ? match[1] : "";
}

/**
 * The welcome card after a good scan: their furbaby's photo over their
 * initials (so the card never waits for the photo), the event, their name.
 */
function WelcomeCard({ base, eventId, title, person, message, onClose }) {
  const [photoShown, setPhotoShown] = useState(false);
  const [left, setLeft] = useState(WELCOME_COUNTDOWN_SECONDS);
  useEffect(() => {
    if (left <= 0) { onClose(); return undefined; }
    const timer = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left, onClose]);
  const line = welcomeMessageLine(message);
  const photo = person?.photo?.source && person.photo.source !== "initials"
    ? `${base}/checkin/photo/${eventId}/${person.id}?v=${encodeURIComponent(person.photo.version)}`
    : null;
  return (
    <div className="checkin-success" role="dialog" aria-modal="true" aria-labelledby="checkin-success-title">
      <div className="checkin-success-card">
        <span className="checkin-welcome-photo" aria-hidden="true">
          <span className="checkin-welcome-initials">{person?.initials || "?"}</span>
          {photo && <img src={photo} alt="" className={photoShown ? "is-shown" : ""} onLoad={() => setPhotoShown(true)} onError={() => setPhotoShown(false)} />}
        </span>
        <p className="tag">Welcome to</p>
        <h2 id="checkin-success-title" className="checkin-welcome-event">{title}</h2>
        <p className="checkin-welcome-name">{person?.name || "Our guest"}</p>
        {person?.furbaby && <p className="checkin-welcome-furbaby">with {person.furbaby}</p>}
        {line && <p className="checkin-welcome-message">{line}</p>}
        <button type="button" className="btn gold" autoFocus onClick={onClose}>Ready for the next guest</button>
        <p className="checkin-welcome-countdown" aria-hidden="true">Next guest in {left}…</p>
      </div>
    </div>
  );
}

export default function Scanner({ base = "", eventId, title, confirmed, initialChecked, successMessage, soundPreset, failureSoundPreset, hasCustomSound }) {
  const video = useRef(null);
  const canvas = useRef(null);
  const busy = useRef(false);
  const lastCode = useRef({ code: "", at: 0 });
  const [camera, setCamera] = useState("off");
  const [result, setResult] = useState(null);
  const [checked, setChecked] = useState(initialChecked);
  const [manual, setManual] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [list, setList] = useState(null);
  const [waiting, setWaiting] = useState(null);
  const [view, setView] = useState("in");
  const [search, setSearch] = useState("");
  const closeSuccess = useCallback(() => setSuccessOpen(false), []);

  // Who's in: on open, after each good scan here, and every 30 s so door phones agree.
  const loadList = useCallback(async () => {
    try {
      const response = await checkedInList(eventId);
      setList(response.rows || []);
      setWaiting(response.waiting || []);
    } catch { /* The list is a convenience; scanning keeps working without it. */ }
  }, [eventId]);
  useEffect(() => {
    loadList();
    const timer = window.setInterval(loadList, 30_000);
    return () => window.clearInterval(timer);
  }, [loadList]);

  function playSuccessSound() {
    if (soundPreset === "silent") return;
    if (soundPreset === "custom" && hasCustomSound) {
      new Audio(`/api/checkin-sound/${eventId}`).play().catch(() => null);
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const now = context.currentTime;
      const notes = soundPreset === "soft" ? [[523.25, 0]] : soundPreset === "celebration" ? [[523.25, 0], [659.25, 0.12], [783.99, 0.24]] : [[659.25, 0], [783.99, 0.1], [1046.5, 0.2]];
      notes.forEach(([frequency, offset]) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(soundPreset === "soft" ? 0.07 : 0.12, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.32);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.34);
      });
      setTimeout(() => context.close(), 900);
    } catch { /* Sound is a welcome extra; check-in must still work without it. */ }
  }

  function playFailureSound() {
    if (failureSoundPreset === "silent") return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const now = context.currentTime;
      const notes = failureSoundPreset === "short" ? [261.63, 196] : [220, 174.61];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.13);
        gain.gain.exponentialRampToValueAtTime(0.09, now + index * 0.13 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.13 + 0.22);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * 0.13);
        oscillator.stop(now + index * 0.13 + 0.24);
      });
      setTimeout(() => context.close(), 700);
    } catch { /* Sound is optional feedback; the visible result is authoritative. */ }
  }

  const submit = useCallback(async (code) => {
    if (!code || busy.current) return;
    busy.current = true;
    try {
      const response = await checkInByCode(eventId, code);
      setResult(response);
      if (response.outcome === "ok") {
        setChecked((n) => n + 1);
        loadList();
      setSuccessOpen(true);
        playSuccessSound();
      } else playFailureSound();
      if (navigator.vibrate) navigator.vibrate(response.outcome === "ok" ? 80 : [60, 60, 60]);
    } finally {
      // A short pause so one QR held in view isn't read twice.
      setTimeout(() => { busy.current = false; }, 1500);
    }
  }, [eventId, loadList]);

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
        {successOpen && result?.outcome === "ok" && (
          <WelcomeCard key={result.person?.id} base={base} eventId={eventId} title={title} person={result.person} message={successMessage} onClose={closeSuccess} />
        )}
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
                <p className="muted">{result.person.furbaby ? `With ${result.person.furbaby}` : "No furbaby listed"}{result.person.ticket ? ` · ${result.person.ticket}` : ""}{result.person.feeStatus ? ` · fee: ${FEE_TEXT[result.person.feeStatus] || result.person.feeStatus}` : ""}</p>
                {result.outcome === "unpaid" && <p className="small">Not checked in. Only someone with fee access can approve a payment: check it on the Registrations page, then scan again.</p>}
                {result.outcome === "consent-required" && <p className="small">Not checked in yet. Ask them to open their private RSVP page, complete the event acknowledgement, then scan their QR again.</p>}
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
          <ConfirmButton
            className="btn ghost"
            title="Check in this code?"
            echo={[]}
            items={[`The matching registration is checked in to ${title}`, "The check-in time is saved under your admin account"]}
            yes="Yes, check in"
            tone="ghost"
          >Check in</ConfirmButton>
        </form>
        <p className="small muted">Someone who said no to photos shows a “No photos” flag here. Let the photographers know.</p>

        <section className="card checkin-list" aria-label="Guests">
          <nav className="tabs" aria-label="Show">
            <button type="button" aria-pressed={view === "in"} aria-current={view === "in" ? "page" : undefined} onClick={() => setView("in")}>Checked in{list ? ` · ${list.length}` : ""}</button>
            <button type="button" aria-pressed={view === "waiting"} aria-current={view === "waiting" ? "page" : undefined} onClick={() => setView("waiting")}>Not checked in{waiting ? ` · ${waiting.length}` : ""}</button>
          </nav>
          <label className="field"><span className="visually-hidden">Search guests</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a name or furbaby" /></label>
          {(view === "in" ? list : waiting) === null ? <p className="small muted">Loading…</p> : (() => {
            const all = view === "in" ? list : waiting;
            const q = search.trim().toLowerCase();
            const shown = q ? all.filter((row) => row.name.toLowerCase().includes(q) || row.furbaby.toLowerCase().includes(q)) : all;
            if (!shown.length) return <p className="small muted">{q ? "No one by that name here." : view === "in" ? "No one has checked in yet." : "Everyone confirmed is in."}</p>;
            return (
              <ol>
                {shown.map((row) => (
                  <li key={row.id}>
                    {row.photo.source !== "initials"
                      ? <img className="person-avatar" src={`${base}/checkin/photo/${eventId}/${row.id}?v=${encodeURIComponent(row.photo.version)}`} alt="" width={36} height={36} style={{ width: 36, height: 36 }} loading="lazy" />
                      : <span className="person-avatar is-empty" style={{ width: 36, height: 36, fontSize: 13 }} aria-hidden="true">{row.initials}</span>}
                    <span><strong>{row.name}</strong>{row.furbaby && <span className="small muted"> · {row.furbaby}</span>}{row.manual && <><br /><span className="small muted">Added by hand</span></>}</span>
                    {row.at && <span className="small checkin-list-time">{new Intl.DateTimeFormat("en-PH", { timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(row.at))}</span>}
                  </li>
                ))}
              </ol>
            );
          })()}
        </section>
      </div>
    </div>
  );
}
