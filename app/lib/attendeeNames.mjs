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

const TRUE = new Set([true, "true", "on", "yes", 1, "1"]);

/**
 * Which furbabies crossed the rainbow bridge, one flag per furbaby by position
 * (people.furbaby_rainbow, migration 050), or null when none did.
 */
export function cleanRainbow(input, furbabies) {
  if (!Array.isArray(input)) return null;
  const list = input.slice(0, Math.max(0, Number(furbabies) || 0)).map((v) => TRUE.has(v));
  return list.some(Boolean) ? list : null;
}

/** The names of the furbabies still with them ("Java and Bink"), for {{furbaby_name}} in emails. */
export function livingFurbabyNames(names, rainbow) {
  const list = splitFurbabyNames(names);
  if (!rainbow?.some(Boolean)) return String(names ?? "").trim();
  const living = list.filter((_, i) => !rainbow[i]);
  return living.length <= 1 ? living.join("") : `${living.slice(0, -1).join(", ")} and ${living[living.length - 1]}`;
}

/** The furbaby names for the Join sheet, with a 🌈 after each one remembered: "Khalee, Audrey 🌈". */
export function sheetFurbabyNames(names, rainbow, furbabies) {
  const list = Array.isArray(names) ? names.slice(0, Math.max(0, Number(furbabies) || 0)) : [];
  return list
    .map((name, i) => [String(name ?? "").trim().replace(/\s+/g, " ").slice(0, 60), rainbow?.[i]])
    .filter(([name]) => name)
    .map(([name, gone]) => (gone ? `${name} 🌈` : name))
    .join(", ")
    .slice(0, 120);
}
