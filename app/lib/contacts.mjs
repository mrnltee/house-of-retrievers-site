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
  const email = clean(input.email, CONTACT_LIMITS.email).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };
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
      notes: notes || null,
    },
  };
}
