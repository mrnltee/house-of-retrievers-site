/**
 * Names typed per attendee on the RSVP. "Your name" is hooman 1, so
 * `guest_names` (migration 042) holds hoomans 2..n, "" where skipped.
 * Furbaby names still live in the one `furbaby_name` line ("Mochi, Fudge").
 */

const clean = (value, max) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);

/** The other hoomans' names → one per extra person, or null when none was typed. */
export function cleanGuestNames(input, humans) {
  if (!Array.isArray(input)) return null;
  const list = input.slice(0, Math.max(0, (Number(humans) || 1) - 1)).map((name) => clean(name, 120));
  return list.some(Boolean) ? list : null;
}

/** Per-furbaby names → "Mochi, Fudge" (blank ones skipped). */
export function joinFurbabyNames(input, furbabies) {
  const list = Array.isArray(input) ? input.slice(0, Math.max(0, Number(furbabies) || 0)) : [];
  return list.map((name) => clean(name, 60)).filter(Boolean).join(", ").slice(0, 240);
}

/** The saved furbaby line → one name per furbaby: "Khalee and Audrey", "Mochi, Fudge & Pao". */
export function splitFurbabyNames(text) {
  return String(text ?? "")
    .split(/\s*,\s*(?:and\s+)?|\s+and\s+|\s*&\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
}
