"use client";

import { useEffect, useId, useRef, useState } from "react";
import LetterPreview from "./LetterPreview";

// Desktop email preview: drawn at a desktop mail window's width, then scaled
// down to fit the narrow preview column (C-060).
const DESKTOP_WIDTH = 720;
const FRAME_HEIGHT = 760;

/**
 * The letter preview with a switch to the covering email as recipients get it
 * (phone or desktop width) and to the actual PDF (owner, 2026-10-27): the
 * same file the recipient gets, with its fillable fields, drawn by the
 * browser's PDF viewer. `fields` are posted to the PDF route; the PDF redraws
 * a moment after they stop changing.
 */
export default function LetterView({ text, action, fields, email, initial = "page" }) {
  const [mode, setMode] = useState(email ? initial : "page");
  const [width, setWidth] = useState("phone");
  const form = useRef(null);
  const frame = `letter-pdf-${useId().replace(/:/g, "")}`;
  const signature = JSON.stringify(fields);
  const box = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setScale(Math.min(1, el.clientWidth / DESKTOP_WIDTH) || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode, width]);

  useEffect(() => {
    if (mode !== "pdf") return undefined;
    const timer = setTimeout(() => form.current?.submit(), 600);
    return () => clearTimeout(timer);
  }, [mode, signature]);

  return (
    <>
      <div className="seg" role="group" aria-label="Preview as">
        <button type="button" className={mode === "page" ? "is-on" : ""} aria-pressed={mode === "page"} onClick={() => setMode("page")}>Letter (page view)</button>
        {email && <button type="button" className={mode === "email" ? "is-on" : ""} aria-pressed={mode === "email"} onClick={() => setMode("email")}>Email</button>}
        <button type="button" className={mode === "pdf" ? "is-on" : ""} aria-pressed={mode === "pdf"} onClick={() => setMode("pdf")}>Attachment (actual PDF)</button>
      </div>
      {mode === "email" && email ? (
        <>
          <div className="segmented" role="group" aria-label="Email preview width">
            <button type="button" aria-pressed={width === "phone"} onClick={() => setWidth("phone")}>Phone</button>
            <button type="button" aria-pressed={width === "desktop"} onClick={() => setWidth("desktop")}>Desktop</button>
          </div>
          {width === "desktop" ? (
            <div ref={box} className="template-frame-scaler" style={{ height: FRAME_HEIGHT }}>
              <iframe
                title="The covering email"
                className="template-frame is-desktop"
                srcDoc={email.html}
                sandbox=""
                style={{ width: DESKTOP_WIDTH, height: FRAME_HEIGHT / scale, transform: `scale(${scale})` }}
              />
            </div>
          ) : (
            <iframe title="The covering email" className={`template-frame is-${width}`} srcDoc={email.html} sandbox="" />
          )}
          <p className="small muted" style={{ margin: 0 }}>The email the letter is attached to, as the recipient sees it. Links work in the real email.</p>
        </>
      ) : mode === "pdf" ? (
        <>
          <form ref={form} method="post" action={action} target={frame} hidden>
            {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value ?? ""} />)}
          </form>
          <iframe name={frame} title="The letter as a PDF" className="letter-pdf-frame" />
          <p className="small muted" style={{ margin: 0 }}>This is the file that's attached. Highlighted boxes are fields the recipient can type into.</p>
        </>
      ) : (
        <LetterPreview text={text} />
      )}
    </>
  );
}
