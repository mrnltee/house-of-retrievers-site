"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A "Send … to ticked" button that stays disabled until at least one row
 * (an input name="to" in the same form) is ticked, and shows how many are.
 */
export default function TickedSubmit({ children, className = "btn dark" }) {
  const button = useRef(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const form = button.current?.form;
    if (!form) return undefined;
    const update = () => setCount(form.querySelectorAll('input[name="to"]:checked').length);
    update();
    form.addEventListener("change", update);
    return () => form.removeEventListener("change", update);
  }, []);
  return (
    <button ref={button} type="submit" className={className} disabled={count === 0} title={count === 0 ? "Tick at least one row first" : undefined} data-confirm="not-needed-read-only">
      {children}{count > 0 ? ` (${count})` : ""}
    </button>
  );
}
