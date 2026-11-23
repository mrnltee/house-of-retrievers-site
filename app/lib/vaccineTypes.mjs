/**
 * Vaccine records by type (owner, 22 Nov 2026). An event that asks for vaccination
 * cards can list the vaccines it checks (rsvp_form_config.vaccines, each optional
 * or required); guests upload a photo per vaccine, and admins mark each one
 * checked (registration_vaccine_checks). Photos without a type are the older
 * "whole card" uploads and stay valid.
 */

export const VACCINE_TYPES = [
  { key: "5in1", label: "5-in-1 (DHPPiL)", short: "5-in-1", hint: "Distemper, hepatitis, parvo, parainfluenza and lepto (also 6-in-1 or 8-in-1)" },
  { key: "rabies", label: "Anti-rabies", short: "Rabies", hint: "Rabies shot, signed by the vet" },
  { key: "kennel-cough", label: "Kennel cough (Bordetella)", short: "Kennel cough", hint: "Bordetella, by injection or nose drops" },
];
const KEYS = new Set(VACCINE_TYPES.map((v) => v.key));
/** Uploads that aren't one of the vaccines (other pages of the card). */
export const OTHER_VACCINE = "other";

export const isVaccineKey = (key) => KEYS.has(key);
/** A record's type: a known vaccine, "other", or null for a photo sent before types. */
export const cleanVaccineKey = (key) => (KEYS.has(key) || key === OTHER_VACCINE ? key : null);
export const vaccineLabel = (key) => VACCINE_TYPES.find((v) => v.key === key)?.label || (key === OTHER_VACCINE ? "Other page" : "Vaccination card");
export const vaccineShort = (key) => VACCINE_TYPES.find((v) => v.key === key)?.short || (key === OTHER_VACCINE ? "Other" : "Card");

/** rsvp_form_config.vaccines → [{ key, required }] in the built-in order, known vaccines only. */
export function cleanVaccines(list) {
  if (!Array.isArray(list)) return [];
  const byKey = new Map();
  for (const item of list) {
    const key = typeof item === "string" ? item : item?.key;
    if (KEYS.has(key) && !byKey.has(key)) byKey.set(key, { key, required: Boolean(item?.required) });
  }
  return VACCINE_TYPES.filter((v) => byKey.has(v.key)).map((v) => byKey.get(v.key));
}

/**
 * Required vaccines with no photo, per furbaby: [{ index, keys }] for the furbabies
 * that miss any. `uploads` are [{ index, vaccine }].
 */
export function missingVaccines(uploads, furbabies, vaccines) {
  const required = cleanVaccines(vaccines).filter((v) => v.required).map((v) => v.key);
  if (!required.length) return [];
  const out = [];
  for (let index = 0; index < Math.max(0, Number(furbabies) || 0); index++) {
    const have = new Set((uploads || []).filter((u) => u.index === index).map((u) => u.vaccine));
    const keys = required.filter((key) => !have.has(key));
    if (keys.length) out.push({ index, keys });
  }
  return out;
}

/** "Add a photo of furbaby 2's Anti-rabies record." for the RSVP's refusal. */
export function missingVaccinesMessage(missing, furbabies) {
  if (!missing.length) return "";
  const parts = missing.map(({ index, keys }) => {
    const names = keys.map(vaccineLabel);
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
    return Number(furbabies) > 1 ? `furbaby ${index + 1}: ${list}` : list;
  });
  return `Add a photo of each required vaccine record (${parts.join("; ")}).`;
}

/**
 * Each listed vaccine's state for one furbaby: missing (no photo), uploaded, or
 * verified (an admin checked it). `records` are [{ index, vaccine }], `checks`
 * [{ index, vaccine }]. A vaccine checked without a photo (sent another way)
 * still counts as verified.
 */
export function vaccineStatus(records, checks, index, vaccines) {
  return cleanVaccines(vaccines).map(({ key, required }) => {
    const verified = (checks || []).some((c) => c.index === index && c.vaccine === key);
    const uploaded = (records || []).some((r) => r.index === index && r.vaccine === key);
    return { key, label: vaccineLabel(key), short: vaccineShort(key), required, state: verified ? "verified" : uploaded ? "uploaded" : "missing" };
  });
}

/** One line for a list or the door: "5-in-1 ✓ · Rabies to check · Kennel cough missing". */
export const STATE_WORDS = { verified: "checked", uploaded: "to check", missing: "missing" };

/** Whether every required vaccine of every furbaby has been checked. */
export function allRequiredVerified(records, checks, furbabies, vaccines) {
  for (let i = 0; i < Math.max(0, Number(furbabies) || 0); i++) {
    if (vaccineStatus(records, checks, i, vaccines).some((s) => s.required && s.state !== "verified")) return false;
  }
  return true;
}

/**
 * One state per listed vaccine across every furbaby on a registration, for a list
 * row or the door: verified only when all are, missing when any has no photo.
 */
export function vaccineSummary(records, checks, furbabies, vaccines) {
  const dogs = Math.min(10, Math.max(0, Number(furbabies) || 0));
  if (!dogs) return [];
  return cleanVaccines(vaccines).map(({ key, required }) => {
    const states = Array.from({ length: dogs }, (_, i) => vaccineStatus(records, checks, i, [{ key, required }])[0].state);
    const state = states.every((x) => x === "verified") ? "verified" : states.some((x) => x === "missing") ? "missing" : "uploaded";
    return { key, short: vaccineShort(key), required, state };
  });
}
