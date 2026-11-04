"use client";

import { useEffect, useRef } from "react";
import { cleanHtml, toHex } from "../../../../../lib/emailDesign.mjs";

const SIZES = [["", "Size"], ["2", "Small"], ["3", "Normal"], ["4", "Large"], ["5", "Larger"], ["6", "Huge"]];

/**
 * A text block's editor: type as in a document (Enter = new paragraph, Shift+Enter =
 * new line), with bold, italic, underline, link, lists, colour and size. Pasted text
 * is cleaned to the same formatting; the server cleans again on save.
 */
export default function RichText({ html, onChange, disabled = false }) {
  const box = useRef(null);
  useEffect(() => {
    if (box.current) box.current.innerHTML = cleanHtml(html);
    // Set once per block (the parent remounts this per selection); typing must not reset the caret.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = () => onChange(box.current?.innerHTML || "");
  const run = (command, value = null) => {
    box.current?.focus();
    // Colour and size as styles; bold, italic, underline and lists as plain tags.
    document.execCommand("styleWithCSS", false, command === "foreColor" || command === "fontSize");
    document.execCommand(command, false, value);
    changed();
  };
  function link() {
    const url = window.prompt("Link address (https://… or mailto:…)", "https://");
    if (!url) return;
    if (!/^(https?:\/\/|mailto:)/i.test(url.trim())) { window.alert("Links need to start with https:// or mailto:"); return; }
    run("createLink", url.trim());
  }
  function paste(event) {
    event.preventDefault();
    const rich = event.clipboardData.getData("text/html");
    const plain = event.clipboardData.getData("text/plain");
    const safe = rich ? cleanHtml(rich) : cleanHtml(plain.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>"));
    document.execCommand("insertHTML", false, safe);
    changed();
  }
  const tool = (label, icon, onClick) => (
    <button type="button" className="rt-tool" data-confirm="not-needed-read-only" aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick} disabled={disabled}>{icon}</button>
  );
  return (
    <div className="rt">
      <div className="rt-bar" role="toolbar" aria-label="Text formatting">
        {tool("Bold", <strong>B</strong>, () => run("bold"))}
        {tool("Italic", <em>I</em>, () => run("italic"))}
        {tool("Underline", <u>U</u>, () => run("underline"))}
        {tool("Link", "🔗", link)}
        {tool("Remove link", "⛓︎̸", () => run("unlink"))}
        {tool("Bullet list", "•≡", () => run("insertUnorderedList"))}
        {tool("Numbered list", "1≡", () => run("insertOrderedList"))}
        <label className="rt-color" title="Text colour">
          <span className="sr-only">Text colour</span>
          <input type="color" defaultValue="#2b2a27" onMouseDown={() => box.current?.focus()} onChange={(e) => run("foreColor", toHex(e.target.value))} disabled={disabled} />
        </label>
        <select aria-label="Text size" defaultValue="" onChange={(e) => { if (e.target.value) run("fontSize", e.target.value); e.target.value = ""; }} disabled={disabled}>
          {SIZES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {tool("Clear formatting", "⌫ fmt", () => run("removeFormat"))}
      </div>
      <div ref={box} className="rt-area" contentEditable={!disabled} suppressContentEditableWarning onInput={changed} onBlur={changed} onPaste={paste} role="textbox" aria-multiline="true" aria-label="Text" />
      <p className="small muted" style={{ margin: 0 }}>Enter starts a new paragraph; Shift+Enter starts a new line. Fill-ins like [Salutation] fill in per brand.</p>
    </div>
  );
}
