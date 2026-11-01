/**
 * Letters sent from an event's Brand tracker fill the event's own name into
 * [Event Name] and [Event Short Name] (owner, 2026-11-01); other sends keep
 * the default from Letters → Standard details.
 */
export const EVENT_BLANKS = ["Event Name", "Event Short Name"];

/** "Golden Beginning: Paws and Purpose" → { "Event Name": …, "Event Short Name": "Golden Beginning" }. */
export function eventBlankValues(title) {
  const name = String(title || "").trim();
  if (!name) return {};
  return { "Event Name": name, "Event Short Name": name.split(/\s*[:–—-]\s+/)[0].trim() || name };
}
