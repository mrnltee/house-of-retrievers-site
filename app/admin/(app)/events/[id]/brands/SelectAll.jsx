"use client";

import { useEffect, useRef } from "react";

const boxes = () => [...document.querySelectorAll("#tracker-rows > tr[data-row]:not([hidden]) input[name='to']")];

/** Header box: ticks or clears every row that's showing (after search and filter). */
export default function SelectAll() {
  const box = useRef(null);
  useEffect(() => {
    const update = () => {
      const all = boxes();
      const ticked = all.filter((b) => b.checked).length;
      if (!box.current) return;
      box.current.checked = all.length > 0 && ticked === all.length;
      box.current.indeterminate = ticked > 0 && ticked < all.length;
      box.current.disabled = all.length === 0;
    };
    update();
    document.addEventListener("change", update);
    document.addEventListener("tracker:filtered", update);
    return () => {
      document.removeEventListener("change", update);
      document.removeEventListener("tracker:filtered", update);
    };
  }, []);
  function toggle(event) {
    const on = event.target.checked;
    boxes().forEach((b) => { b.checked = on; });
    document.dispatchEvent(new Event("change"));
  }
  return <input ref={box} type="checkbox" onChange={toggle} aria-label="Pick every brand showing" />;
}
