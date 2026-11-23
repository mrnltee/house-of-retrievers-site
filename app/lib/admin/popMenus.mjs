/**
 * Small "More" menus built from <details class="pop-menu"> behave like menus, not folds (design review,
 * 22 Nov 2026): only one is open at a time, a click or tap outside closes it, and Esc closes it and puts
 * focus back on its button. Without this, menus stayed open and stacked, and a later row's pinned cell
 * covered an earlier row's menu. Same behaviour as the public "Add to calendar" menu in EventsView.jsx.
 *
 * Wired once for the whole admin by PopMenus.jsx (event delegation, so menus added later are covered).
 *
 * @param {Document} doc
 * @returns {() => void} removes the listeners
 */
export function wirePopMenus(doc) {
  const openMenus = () => [...doc.querySelectorAll("details.pop-menu[open]")];

  // `toggle` doesn't bubble, so listen in the capture phase to see every menu open.
  const onToggle = (e) => {
    const el = e.target;
    if (!(el instanceof doc.defaultView.HTMLDetailsElement) || !el.classList.contains("pop-menu") || !el.open) return;
    for (const other of openMenus()) if (other !== el) other.open = false;
  };
  const onPointerDown = (e) => {
    for (const menu of openMenus()) if (!menu.contains(e.target)) menu.open = false;
  };
  const onKeyDown = (e) => {
    if (e.key !== "Escape") return;
    const open = openMenus();
    if (!open.length) return;
    // A confirm dialog opened from a menu handles its own Esc; leave the menu alone then.
    if (doc.querySelector("dialog[open]")) return;
    for (const menu of open) {
      const hadFocus = menu.contains(doc.activeElement);
      menu.open = false;
      if (hadFocus) menu.querySelector("summary")?.focus();
    }
  };

  doc.addEventListener("toggle", onToggle, true);
  doc.addEventListener("pointerdown", onPointerDown);
  doc.addEventListener("keydown", onKeyDown);
  return () => {
    doc.removeEventListener("toggle", onToggle, true);
    doc.removeEventListener("pointerdown", onPointerDown);
    doc.removeEventListener("keydown", onKeyDown);
  };
}
