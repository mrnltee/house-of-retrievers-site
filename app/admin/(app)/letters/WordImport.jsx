"use client";

import { useState } from "react";
import { docxToLetter } from "../../../lib/docxLetter.mjs";

/**
 * "Start from a Word file" on the New letter forms: reads a .docx in the browser and
 * puts its text in hidden fields (body, subject), so the new letter opens in the
 * editor with that content. HOR's header and footer stay; the file's own don't come across.
 */
export default function WordImport() {
  const [letter, setLetter] = useState(null);
  const [note, setNote] = useState("");
  async function read(event) {
    const input = event.target;
    const file = input.files?.[0];
    setLetter(null);
    setNote("");
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) { setNote("Pick a .docx file. Older .doc files: open in Word and save as .docx first."); input.value = ""; return; }
    if (file.size > 15 * 1024 * 1024) { setNote("That file is over 15 MB. Remove big pictures in Word and try again."); input.value = ""; return; }
    const out = await docxToLetter(new Uint8Array(await file.arrayBuffer()));
    if (out.error) { setNote(out.error); input.value = ""; return; }
    setLetter(out);
    const name = input.form?.elements.namedItem("name");
    if (name && !name.value) name.value = file.name.replace(/\.docx$/i, "").slice(0, 80);
    setNote([
      `Read ${out.body.length.toLocaleString("en-PH")} characters from ${file.name}.`,
      out.pictures ? `${out.pictures} picture${out.pictures === 1 ? " was" : "s were"} left out.` : "",
      out.cut ? "The text was cut to the letter size limit." : "",
      "Check it in the editor before sending.",
    ].filter(Boolean).join(" "));
  }
  return (
    <div className="field word-import">
      <label className="field">
        <span>Start from a Word file <small>Optional. A .docx: its text, bold, headings, lists and tables come in; HOR&apos;s logo header and SEC footer are always used, the file&apos;s own aren&apos;t.</small></span>
        <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={read} />
      </label>
      {letter && <input type="hidden" name="body" value={letter.body} />}
      {letter?.subject && <input type="hidden" name="subject" value={letter.subject} />}
      {note && <p className={`small ${letter ? "muted" : "error-text"}`} role="status" style={{ margin: 0 }}>{note}</p>}
    </div>
  );
}
