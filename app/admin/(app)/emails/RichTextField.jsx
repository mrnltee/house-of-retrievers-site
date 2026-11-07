"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { htmlToMarkup, markupToHtml } from "../../../lib/richMessage.mjs";

/**
 * A what-you-see editor for email wording. It reads and writes the plain markup
 * the emails already use (see richMessage.mjs), so what's stored and sent is
 * unchanged: bold, links, bullets, paragraphs. `value` is that markup;
 * `onChange` gets the new markup after each edit. A hidden input named `name`
 * carries it to the server action. The ref's `insert(text)` puts a variable at
 * the cursor.
 */
const RichTextField = forwardRef(function RichTextField({ name, value, onChange, onFocus, label, hint, minHeight = 160 }, ref) {
  const box = useRef(null);
  const emitted = useRef(value);
  const range = useRef(null);
  const initialHtml = useRef(markupToHtml(value)).current;

  // The value changed from outside (Start from…, Undo, original wording): redraw.
  useEffect(() => {
    if (value !== emitted.current && box.current) {
      box.current.innerHTML = markupToHtml(value);
      emitted.current = value;
    }
  }, [value]);

  function remember() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && box.current?.contains(sel.anchorNode)) range.current = sel.getRangeAt(0).cloneRange();
  }
  function restore() {
    box.current?.focus();
    const sel = window.getSelection();
    if (range.current && sel) { sel.removeAllRanges(); sel.addRange(range.current); }
  }
  function changed() {
    const markup = htmlToMarkup(box.current.innerHTML);
    emitted.current = markup;
    onChange(markup);
  }
  const run = (command, arg) => { restore(); document.execCommand(command, false, arg); changed(); remember(); };

  useImperativeHandle(ref, () => ({
    insert(text) { restore(); document.execCommand("insertText", false, text); changed(); remember(); },
  }));

  function addLink() {
    restore();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { window.alert("Select the words that should be the link first."); return; }
    const url = window.prompt("Link address (starts with https://)", "https://");
    if (!url) return;
    if (!/^https:\/\/[^\s()<>"]+$/.test(url.trim())) { window.alert("The address has to start with https:// and have no spaces."); return; }
    run("createLink", url.trim());
  }

  const stop = (e) => e.preventDefault(); // keep the editor's selection when a toolbar button is pressed

  return (
    <div className="field rich-field">
      <span>{label} {hint && <small>{hint}</small>}</span>
      <input type="hidden" name={name} value={value} />
      <div className="rich-bar" role="toolbar" aria-label={`${label} formatting`}>
        <button type="button" onMouseDown={stop} onClick={() => run("bold")} title="Bold (Ctrl/⌘ B)"><strong>B</strong></button>
        <button type="button" onMouseDown={stop} onClick={addLink} title="Make the selected words a link">Link</button>
        <button type="button" onMouseDown={stop} onClick={() => run("insertUnorderedList")} title="Bulleted list">• List</button>
        <button type="button" onMouseDown={stop} onClick={() => run("removeFormat")} title="Remove bold and links from the selection">Clear</button>
      </div>
      <div
        ref={box}
        className="rich-box"
        style={{ minHeight }}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        onInput={changed}
        onFocus={() => { onFocus?.(); remember(); }}
        onBlur={remember}
        onKeyUp={remember}
        onMouseUp={remember}
        onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
      />
    </div>
  );
});

export default RichTextField;
