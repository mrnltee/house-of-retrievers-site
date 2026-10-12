"use client";

import { useId, useRef, useState } from "react";

/**
 * A submit button that asks first (Figma R4: every action confirms). The
 * click checks the form, then opens a dialog saying what will happen; only
 * "Yes" submits, through this same button, so its formAction is used.
 *
 * - `items`: what happens, one line each.
 * - `echo`: [{ name, label }] form fields to repeat in the dialog (e.g. the
 *   reason or reference typed), read when the dialog opens.
 * - `note`: a highlighted caution under the list.
 */
export default function ConfirmButton({ children, className = "btn gold", formAction, title, items = [], echo = [], note = "", yes = "Yes, go ahead", tone = "gold", disabled = false, name, value }) {
  const button = useRef(null);
  const dialog = useRef(null);
  const confirmed = useRef(false);
  const [echoed, setEchoed] = useState([]);
  const id = useId();

  function onClick(event) {
    if (confirmed.current) {
      confirmed.current = false;
      return;
    }
    event.preventDefault();
    const form = button.current?.form;
    if (form && !form.reportValidity()) return;
    const data = form ? new FormData(form) : null;
    setEchoed(echo.map(({ name: field, label }) => {
      const element = form?.elements.namedItem(field);
      let shown = data?.get(field);
      if (element && element.tagName === "SELECT") shown = element.selectedOptions?.[0]?.textContent;
      if (shown instanceof File) shown = shown.name;
      return [label, String(shown || "").trim() || "—"];
    }));
    dialog.current?.showModal();
  }

  function go() {
    dialog.current?.close();
    confirmed.current = true;
    const form = button.current?.form;
    if (form?.requestSubmit) form.requestSubmit(button.current);
    else button.current?.click();
  }

  return (
    <>
      <button ref={button} type="submit" data-confirmed-action="true" className={className} formAction={formAction} onClick={onClick} disabled={disabled} name={name} value={value}>{children}</button>
      <dialog ref={dialog} className="confirm-dialog" aria-labelledby={`${id}-title`}>
        <div className="confirm-body">
          <h2 id={`${id}-title`}>{title}</h2>
          {(items.length > 0 || echoed.length > 0) && <p className="confirm-label">What happens</p>}
          {(items.length > 0 || echoed.length > 0) && (
            <ul className="confirm-list">
              {echoed.map(([label, text]) => <li key={label}><strong>{label}:</strong> {text}</li>)}
              {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          {note && <p className="banner note small" style={{ margin: 0 }}>{note}</p>}
          <div className="actions">
            <button type="button" className={`btn ${tone}`} onClick={go}>{yes}</button>
            <button type="button" className="btn ghost" onClick={() => dialog.current?.close()} autoFocus>Go back</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
