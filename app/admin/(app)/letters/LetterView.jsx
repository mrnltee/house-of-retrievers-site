"use client";

import { useEffect, useId, useRef, useState } from "react";
import LetterPreview from "./LetterPreview";

/**
 * The letter preview with a switch to the actual PDF (owner, 2026-10-27): the
 * same file the recipient gets, with its fillable fields, drawn by the
 * browser's PDF viewer. `fields` are posted to the PDF route; the PDF redraws
 * a moment after they stop changing.
 */
export default function LetterView({ text, action, fields }) {
  const [mode, setMode] = useState("page");
  const form = useRef(null);
  const frame = `letter-pdf-${useId().replace(/:/g, "")}`;
  const signature = JSON.stringify(fields);

  useEffect(() => {
    if (mode !== "pdf") return undefined;
    const timer = setTimeout(() => form.current?.submit(), 600);
    return () => clearTimeout(timer);
  }, [mode, signature]);

  return (
    <>
      <div className="seg" role="group" aria-label="Preview as">
        <button type="button" className={mode === "page" ? "is-on" : ""} aria-pressed={mode === "page"} onClick={() => setMode("page")}>Page view</button>
        <button type="button" className={mode === "pdf" ? "is-on" : ""} aria-pressed={mode === "pdf"} onClick={() => setMode("pdf")}>Actual PDF</button>
      </div>
      {mode === "pdf" ? (
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
