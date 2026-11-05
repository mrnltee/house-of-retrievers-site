"use client";

/** Header box in the brand list: ticks or clears every brand showing (BatchBar keeps it in step). */
export default function SelectAllBrands() {
  function toggle(event) {
    document.querySelectorAll("input[form='brand-batch'][name='id']").forEach((b) => { b.checked = event.target.checked; });
    document.dispatchEvent(new Event("change"));
  }
  return <input id="brand-select-all" type="checkbox" onChange={toggle} aria-label="Select every brand showing" />;
}
