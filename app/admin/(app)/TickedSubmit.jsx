"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * The send button on lists: disabled until at least one row (an input
 * name="to" in the same form) is ticked. It opens the review page (each
 * person's email and PDF) and sends nothing itself, hence "Review & send",
 * with the count when more than one is ticked (owner, 2026-10-31).
 */
export default function TickedSubmit({ className = "btn dark" }) {
  const button = useRef(null);
  const [count, setCount] = useState(0);
  const hint = useId();
  useEffect(() => {
    const form = button.current?.form;
    if (!form) return undefined;
    const update = () => setCount(form.querySelectorAll('input[name="to"]:checked').length);
    update();
    form.addEventListener("change", update);
    return () => form.removeEventListener("change", update);
  }, []);
  return (
    <>
      <button ref={button} type="submit" className={className} disabled={count === 0} aria-describedby={count === 0 ? hint : undefined} data-confirm="not-needed-read-only">
        {count > 1 ? `Review & send (${count})` : "Review & send"}
      </button>
      {count === 0 && <span id={hint} className="small muted">Tick at least one person</span>}
    </>
  );
}
