/**
 * Guest list (Letters → Guest list): who HOR sends letters to, by category.
 * Each category matches the letter written for it in Settings → Letters, so
 * picking a group picks its letter. Pure functions, so they can be tested.
 */
export const CONTACT_CATEGORIES = [
  { key: "politician", label: "Politicians & guests of honor", letter: "invite-guests-of-honor" },
  { key: "speaker", label: "Guest speakers (animal advocates)", letter: "invite-guest-speaker" },
  { key: "celebrity", label: "Celebrities", letter: "invite-special-guest" },
  { key: "vip", label: "VIP furparents & special guests", letter: "invite-special-guest" },
  { key: "influencer", label: "Influencers & creators", letter: "invite-creators" },
  { key: "media", label: "Media & press", letter: "invite-media" },
  { key: "sponsor", label: "Sponsors (brands & companies)", letter: "sponsorship-letter" },
  { key: "partner", label: "X-Deal partners", letter: "xdeal-proposal" },
  { key: "donor", label: "Cash donors", letter: "donation-letter" },
];

export const CONTACT_LIMITS = { name: 120, organization: 120, email: 200, phone: 60, handle: 120, notes: 1000, address: 300, salutation: 120 };

/** Who a guest's letters are emailed to. */
export const SEND_TO = [
  ["person", "The person"],
  ["representative", "Their representative"],
  ["both", "Both (representative copied)"],
];

/**
 * The addresses a guest's letter goes to: { to, cc }. Falls back to whichever
 * address there is, so a missing one never blocks a send.
 */
export function letterEmails(c = {}) {
  const person = String(c.email || "").trim();
  const rep = String(c.rep_email || "").trim();
  if (c.send_to === "representative") return { to: rep || person, cc: [] };
  if (c.send_to === "both" && person && rep && person.toLowerCase() !== rep.toLowerCase()) return { to: person, cc: [rep] };
  return { to: person || rep, cc: [] };
}

export const categoryOf = (key) => CONTACT_CATEGORIES.find((c) => c.key === key) || null;
/** Every group that gets a letter, with its default: the Guest list categories, then Beneficiaries. */
export const LETTER_GROUPS = [...CONTACT_CATEGORIES, { key: "beneficiary", label: "Beneficiaries (shelters & rescue groups)", letter: "beneficiary-proposal" }];

/** The letter a group gets: the admin's choice (Letters → Which letter each group gets), else the default. */
export const letterFor = (key, chosen = {}) => chosen[key] || LETTER_GROUPS.find((g) => g.key === key)?.letter || "";

const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Form fields → { contact } or { error }. */
export function cleanContact(input = {}) {
  const category = categoryOf(input.category)?.key;
  if (!category) return { error: "Pick a category." };
  const name = clean(input.name, CONTACT_LIMITS.name);
  if (!name) return { error: "Type the name as it should appear on the letter." };
  const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const email = clean(input.email, CONTACT_LIMITS.email).toLowerCase();
  if (email && !looksLikeEmail(email)) return { error: "That email doesn't look right." };
  const repEmail = clean(input.repEmail, CONTACT_LIMITS.email).toLowerCase();
  if (repEmail && !looksLikeEmail(repEmail)) return { error: "The representative's email doesn't look right." };
  const sendTo = SEND_TO.some(([k]) => k === input.sendTo) ? input.sendTo : "person";
  const notes = String(input.notes ?? "").trim().slice(0, CONTACT_LIMITS.notes);
  return {
    contact: {
      category, name, email: email || null,
      organization: clean(input.organization, CONTACT_LIMITS.organization) || null,
      phone: clean(input.phone, CONTACT_LIMITS.phone) || null,
      handle: clean(input.handle, CONTACT_LIMITS.handle) || null,
      // An address keeps its line breaks (one line each in the letter).
      address: String(input.address ?? "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n").slice(0, CONTACT_LIMITS.address) || null,
      salutation: clean(input.salutation, CONTACT_LIMITS.salutation) || null,
      repName: clean(input.repName, CONTACT_LIMITS.name) || null,
      repEmail: repEmail || null,
      repPhone: clean(input.repPhone, CONTACT_LIMITS.phone) || null,
      sendTo,
      notes: notes || null,
    },
  };
}
