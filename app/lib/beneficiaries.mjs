/**
 * Beneficiaries (owner, 2026-10-31): the animal shelters and rescue groups
 * HOR supports or plans to, with what they need and who to write to. Letters
 * go out like Sponsors & partners; their own letter is the beneficiary proposal.
 * Pure functions, so they can be tested.
 */
export const BENEFICIARY_KINDS = [
  ["shelter", "Animal shelter"],
  ["rescue", "Rescue group"],
  ["sanctuary", "Sanctuary"],
  ["clinic", "Clinic / vet partner"],
  ["other", "Other"],
];

export const BENEFICIARY_STATUSES = [
  ["prospect", "Prospect"],
  ["talking", "Talking"],
  ["partnered", "Partnered"],
  ["ended", "Ended"],
];

export const BENEFICIARY_LETTER = "beneficiary-proposal";
export const BENEFICIARY_LIMITS = { street: 200, barangay: 80, city: 80, province: 80, postalCode: 10, name: 120, description: 2000, needs: 1000, location: 120, website: 300, instagram: 120, contactName: 120, contactEmail: 200, contactPhone: 60, address: 300, salutation: 120, notes: 2000 };

const label = (list, key) => list.find(([k]) => k === key)?.[1] || "";
export const kindLabel = (key) => label(BENEFICIARY_KINDS, key);
export const statusLabel = (key) => label(BENEFICIARY_STATUSES, key);

const line = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const text = (value, max) => String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);
// An address keeps its line breaks (one line each in the letter).
const lines = (value, max) => String(value ?? "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n").slice(0, max);

/**
 * The address as letters print it, one line each:
 * street / barangay, city / province postal code.
 */
export function composeAddress({ street, barangay, city, province, postalCode } = {}) {
  const join = (...parts) => parts.map((p) => String(p || "").trim()).filter(Boolean).join(", ");
  return [String(street || "").trim(), join(barangay, city), [String(province || "").trim(), String(postalCode || "").trim()].filter(Boolean).join(" ")].filter(Boolean).join("\n");
}

/** Form fields → { beneficiary } or { error }. */
export function cleanBeneficiary(input = {}) {
  const L = BENEFICIARY_LIMITS;
  const name = line(input.name, L.name);
  if (!name) return { error: "Type the shelter or group's name." };
  const kind = BENEFICIARY_KINDS.some(([k]) => k === input.kind) ? input.kind : "shelter";
  const status = BENEFICIARY_STATUSES.some(([k]) => k === input.status) ? input.status : "prospect";
  const contactEmail = line(input.contactEmail, L.contactEmail).toLowerCase();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { error: "That email doesn't look right." };
  let website = line(input.website, L.website);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website) {
    try { if (!["http:", "https:"].includes(new URL(website).protocol)) return { error: "That website doesn't look right." }; } catch { return { error: "That website doesn't look right." }; }
  }
  return {
    beneficiary: {
      name, kind, status,
      description: text(input.description, L.description) || null,
      needs: text(input.needs, L.needs) || null,
      street: lines(input.street, L.street) || null,
      barangay: line(input.barangay, L.barangay) || null,
      city: line(input.city, L.city) || null,
      province: line(input.province, L.province) || null,
      postalCode: line(input.postalCode, L.postalCode) || null,
      // The list shows city, province; letters use the full address.
      location: [line(input.city, L.city), line(input.province, L.province)].filter(Boolean).join(", ").slice(0, L.location) || null,
      website: website || null,
      instagram: line(input.instagram, L.instagram) || null,
      contactName: line(input.contactName, L.contactName) || null,
      contactEmail: contactEmail || null,
      contactPhone: line(input.contactPhone, L.contactPhone) || null,
      address: composeAddress({ street: lines(input.street, L.street), barangay: line(input.barangay, L.barangay), city: line(input.city, L.city), province: line(input.province, L.province), postalCode: line(input.postalCode, L.postalCode) }).slice(0, L.address) || null,
      salutation: line(input.salutation, L.salutation) || null,
      notes: text(input.notes, L.notes) || null,
    },
  };
}
