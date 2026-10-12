"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sits inside the membership form and asks before saving: what changes, the
 * member number a first activation gets, and whether the welcome email goes
 * out. Only "Yes" sends the form.
 */
export default function ConfirmMembership({ name, email, current, labels, hasNumber, year, prefix = "HOR", noun = "member" }) {
  const anchor = useRef(null);
  const dialog = useRef(null);
  const confirmed = useRef(false);
  const [state, setState] = useState(null);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return undefined;
    function onSubmit(event) {
      if (confirmed.current) {
        confirmed.current = false;
        return;
      }
      event.preventDefault();
      const data = new FormData(form);
      const next = data.get("membership");
      // The welcome picker: the chosen option's wording, or null for "Don't send".
      const pick = form.elements.namedItem("welcome");
      const welcome = pick && !pick.disabled && pick.value !== "none" ? pick.selectedOptions?.[0]?.textContent || "the welcome email" : null;
      setState({ next, welcome });
      dialog.current?.showModal();
    }
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  function go() {
    const form = anchor.current?.closest("form");
    dialog.current?.close();
    confirmed.current = true;
    form?.requestSubmit();
  }

  const same = state && state.next === current;
  const activating = state?.next === "active" && !hasNumber;
  const yy = String(year).slice(-2);

  return (
    <span ref={anchor} style={{ display: "contents" }}>
      <dialog ref={dialog} className="confirm-dialog" aria-labelledby="membership-confirm-title">
        {state && (
          <div className="confirm-body">
            <h2 id="membership-confirm-title">{same ? "Nothing to change" : `Make ${name.split(" ")[0]} ${labels[state.next]?.toLowerCase()}?`}</h2>
            {same ? (
              <p className="muted">{name} is already {labels[current]?.toLowerCase()}.</p>
            ) : (
              <>
                <p className="confirm-label">What happens</p>
                <ul className="confirm-list">
                  <li>Membership: {labels[current] || "None"} → <strong>{labels[state.next]}</strong></li>
                  {activating && <li>They get the next {noun} number for {year} ({prefix}-{yy}-…), and today becomes their “member since” date. Numbers are never reused.</li>}
                  {activating && <li>{state.welcome ? <>“{state.welcome}” goes to <strong>{email}</strong>.</> : "No welcome email is sent."}</li>}
                  {!activating && hasNumber && <li>Their {noun} number stays the same.</li>}
                  {state.next === "left" && <li>They stay in People with their history; you can make them active again later.</li>}
                </ul>
              </>
            )}
            <div className="actions">
              {same ? (
                <button type="button" className="btn gold" onClick={() => dialog.current?.close()} autoFocus>OK</button>
              ) : (
                <>
                  <button type="button" className="btn gold" onClick={go}>Yes, save</button>
                  <button type="button" className="btn ghost" onClick={() => dialog.current?.close()} autoFocus>Go back</button>
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </span>
  );
}
