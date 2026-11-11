/**
 * Check-in display screen (owner, 2026-11-12): a laptop or TV on the event's
 * check-in page pops up a welcome for every guest checked in at the door by
 * any phone, a few seconds after the scan (it asks the server every
 * POLL_MS). Each welcome stays DISPLAY_SECONDS; when more guests are waiting,
 * each gets QUEUED_SECONDS so a group arriving together doesn't put the
 * screen behind. Pure functions, tested.
 */
export const DISPLAY_SECONDS = 10;
export const QUEUED_SECONDS = 5;
export const POLL_MS = 2500;
/** A queue longer than this drops the oldest, so a rush never leaves the screen minutes behind. */
export const MAX_QUEUE = 12;

/** How long the current welcome stays, given how many are waiting behind it. */
export const holdSeconds = (waiting) => (waiting > 0 ? QUEUED_SECONDS : DISPLAY_SECONDS);

/**
 * New arrivals from a feed response → the queue: oldest first, never one
 * already shown or queued (`seen` is a Set of ids), capped at MAX_QUEUE.
 */
export function enqueue(queue, arrivals, seen) {
  const fresh = [...(arrivals || [])]
    .filter((a) => a && a.id && !seen.has(a.id))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
  for (const a of fresh) seen.add(a.id);
  return [...queue, ...fresh].slice(-MAX_QUEUE);
}

/** The display screen's background (owner, 2026-11-12), set per event in Check-in experience. */
export const DISPLAY_BACKGROUNDS = [
  { key: "dark", label: "Black & gold", hint: "The usual look" },
  { key: "ivory", label: "Ivory", hint: "Light and warm, for bright venues" },
  { key: "poster", label: "Event poster", hint: "The event's poster, blurred and darkened" },
  { key: "image", label: "Your own image", hint: "Upload a background, darkened so names stay readable" },
];
export const cleanDisplayBg = (value) => (DISPLAY_BACKGROUNDS.some((b) => b.key === value) ? value : "dark");

/** What the display shows behind the welcome: { kind, image }. Falls back to black & gold without a picture. */
export function displayBackground({ bg, poster = "", image = "" } = {}) {
  const kind = cleanDisplayBg(bg);
  if (kind === "poster") return poster ? { kind, image: poster } : { kind: "dark", image: "" };
  if (kind === "image") return image ? { kind, image } : { kind: "dark", image: "" };
  return { kind, image: "" };
}
