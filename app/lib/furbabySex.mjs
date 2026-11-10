/**
 * A furbaby's gender (owner, 10 Nov 2026): optional, one per furbaby by position,
 * next to the name and breed. Stored as registrations.furbaby_sexes and
 * people.furbaby_sexes (migration 098): "male", "female", or "" where not said;
 * NULL when none was chosen, so records from before stay as they were.
 * In the admin a male furbaby's name shows in blue and a female's in pink.
 */
export const FURBABY_SEXES = ["male", "female"];
const LABELS = { male: "Male", female: "Female" };

export function sexLabel(value) {
  return LABELS[value] || "";
}

export function cleanSexes(input, furbabies) {
  const list = (Array.isArray(input) ? input : input == null ? [] : [input]).slice(0, Math.max(0, Number(furbabies) || 0));
  const clean = list.map((value) => {
    const v = String(value ?? "").trim().toLowerCase();
    return FURBABY_SEXES.includes(v) ? v : "";
  });
  return clean.some(Boolean) ? clean : null;
}
