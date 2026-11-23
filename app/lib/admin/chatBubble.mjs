/** Rules for the floating team chat (owner, 23 Nov 2026). Pure, so they're tested. */

/** Where the floating chat never shows: the chat page itself, and the guest-facing check-in display screen. */
export function chatBubbleHidden(pathname = "") {
  const path = String(pathname).replace(/\/+$/, "");
  return /(^|\/)chat(\/|$)/.test(path) || /\/checkin\/[^/]+\/display$/.test(path);
}

/**
 * Whether a new message from someone else should chime. `heard` is the newest message id any tab of this
 * browser already chimed for (or saw on load), so two open admin tabs don't both ring, and opening the
 * admin never rings for old messages. A first look (heard 0) only remembers.
 */
export function shouldChime({ lastOther = 0, heard = 0, muted = false } = {}) {
  const last = Number(lastOther) || 0;
  const seen = Number(heard) || 0;
  return !muted && seen > 0 && last > seen;
}

/**
 * How far to lift the chat button so it sits above a save bar stuck to the bottom of the screen.
 * `bars` are the bars' boxes ({top, bottom, left, right}); the button covers [buttonLeft, viewportWidth].
 * A bar counts only when it reaches the bottom edge (it's stuck there) and runs under the button.
 */
export function liftAbove(bars = [], { viewportHeight = 0, buttonLeft = 0, gap = 12 } = {}) {
  let lift = 0;
  for (const b of bars) {
    if (!b || b.bottom < viewportHeight - 2 || b.top >= viewportHeight) continue;
    if (b.right <= buttonLeft) continue;
    lift = Math.max(lift, Math.ceil(viewportHeight - b.top + gap));
  }
  return lift;
}

/** The button's label for screen readers and its tooltip. */
export function chatButtonLabel(unread = 0, open = false) {
  if (open) return "Close team chat";
  const n = Number(unread) || 0;
  return n > 0 ? `Team chat, ${n} unread ${n === 1 ? "message" : "messages"}` : "Open team chat";
}
