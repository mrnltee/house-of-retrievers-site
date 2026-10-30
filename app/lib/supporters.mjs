/**
 * Sponsors and partners: the rules shared by the admin, the public API and
 * the home-page section. Pure functions, so they can be tested.
 */

export const KINDS = ["Sponsor", "Partner"];

export const STATUSES = [
  ["inquiry", "Inquiry"],
  ["talking", "Talking"],
  ["confirmed", "Confirmed"],
  ["ended", "Ended"],
];

/** Sponsor tiers, highest first. Names are HOR's to change; the keys stay. */
export const TIERS = [
  ["pack-leader", "Pack Leader"],
  ["best-friend", "Best Friend"],
  ["good-pup", "Good Pup"],
];

export const GIVES = [
  ["cash", "Cash"],
  ["in-kind", "In-kind"],
  ["services", "Services"],
  ["venue", "Venue"],
];

export const BLURB_MAX = 200;
export const CATEGORY_LABEL_MAX = 60;

const label = (list, key) => list.find(([k]) => k === key)?.[1] || "";
export const statusLabel = (key) => label(STATUSES, key);
export const tierLabel = (key) => label(TIERS, key);
export const givesLabel = (key) => label(GIVES, key);

const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export function supporterSlug(name) {
  return (
    clean(name, 80)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "supporter"
  );
}

function cleanUrl(value) {
  const text = clean(value, 300);
  if (!text) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function cleanHandle(value) {
  const text = clean(value, 80);
  if (!text) return null;
  const match = text.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const handle = (match ? match[1] : text).replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : undefined;
}

function peso(value) {
  const text = String(value ?? "").replace(/[₱,\s]/g, "");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= 100_000_000 ? Math.round(n) : undefined;
}

const on = (v) => v === true || v === "on" || v === "true";

/**
 * Checks the admin form. `show_on_site` is kept only when the record can
 * actually be public: confirmed, with a logo and a blurb. Ended switches it off.
 * @returns {{ value?: object, error?: string, notes?: string[] }}
 */
export function validateSupporter(input, { legacyCode = null } = {}) {
  const value = {
    kind: KINDS.includes(input?.kind) ? input.kind : null,
    name: clean(input?.name, 80),
    status: STATUSES.some(([k]) => k === input?.status) ? input.status : "inquiry",
    tier: TIERS.some(([k]) => k === input?.tier) ? input.tier : null,
    website: cleanUrl(input?.website),
    instagram: cleanHandle(input?.instagram),
    blurb: clean(input?.blurb, BLURB_MAX) || null,
    categoryLabel: clean(input?.categoryLabel, CATEGORY_LABEL_MAX) || null,
    gives: GIVES.map(([k]) => k).filter((k) => [].concat(input?.gives || []).includes(k)),
    supportYear: input?.supportYear ? Number(input.supportYear) : null,
    cashAmount: peso(input?.cashAmount),
    inKindValue: peso(input?.inKindValue),
    inKindNote: clean(input?.inKindNote, 160) || null,
    showOnSite: on(input?.showOnSite),
    amountsAgreed: on(input?.amountsAgreed),
    contactName: clean(input?.contactName, 120) || null,
    contactEmail: clean(input?.contactEmail, 160).toLowerCase() || null,
    contactPhone: clean(input?.contactPhone, 40) || null,
    address: String(input?.address ?? "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n").slice(0, 300) || null,
    salutation: clean(input?.salutation, 120) || null,
    notes: String(input?.notes ?? "").trim().slice(0, 2000) || null,
    logo: clean(input?.logo, 300) || null,
    code: String(input?.code ?? "").trim().toUpperCase() || null,
  };
  if (!value.name) return { error: "Give the sponsor or partner a name." };
  if (!value.kind) return { error: "Pick Sponsor or Partner." };
  if (value.website === undefined) return { error: "The website should be a link, like https://example.com" };
  if (value.instagram === undefined) return { error: "Instagram should be a handle like @name, or the profile link." };
  if (value.cashAmount === undefined || value.inKindValue === undefined) return { error: "Amounts should be numbers in pesos, like 15000." };
  if (value.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contactEmail)) return { error: "The contact email doesn't look right." };
  if (value.supportYear != null && !(Number.isInteger(value.supportYear) && value.supportYear >= 2020 && value.supportYear <= 2100)) return { error: "Pick the year these amounts are for." };
  if (value.logo && !value.logo.startsWith("/api/event-image/")) value.logo = null;
  const keepsLegacyCode = /^[A-Z]{3}$/.test(legacyCode || "") && value.code === legacyCode;
  if (value.code && !/^[A-Z]{4}$/.test(value.code) && !keepsLegacyCode) return { error: "The ID code should be 4 letters, like NVTL." };
  if (value.status === "confirmed" && !value.code) return { error: "Give them a 4-letter ID code before confirming. It goes in their number, e.g. HOR-NVTL-26-0001." };
  if (value.kind === "Partner") value.tier = null;

  const notes = [];
  if (value.showOnSite) {
    const missing = [];
    if (value.status !== "confirmed") missing.push("Confirmed status");
    if (!value.logo) missing.push("a logo");
    if (!value.blurb) missing.push("a blurb");
    if (missing.length) {
      value.showOnSite = false;
      notes.push(`Not shown on the website yet: it needs ${missing.join(", ")}.`);
    }
  }
  return { value, notes };
}

/**
 * A 4-letter placeholder ID code from the organization name. Four or more
 * words use their initials; shorter names add consonants from the words, then
 * remaining letters. The admin may replace this suggestion before numbering.
 */
export function suggestCode(name) {
  const words = String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/&/g, " ")
    .split(/[^A-Z0-9]+/)
    .filter((w) => w && !["THE", "AND", "OF", "INC", "CO", "CORP", "LTD"].includes(w));
  if (!words.length) return "";
  const initials = words.slice(0, 4).map((word) => word[0]).join("");
  if (initials.length === 4) return initials;
  const tails = words.map((word) => word.slice(1)).join("");
  const consonants = tails.replace(/[AEIOU]/g, "");
  const vowels = tails.replace(/[^AEIOU]/g, "");
  return `${initials}${consonants}${vowels}`.slice(0, 4).padEnd(4, "X");
}

/**
 * "HOR-NVTL-26-0001": the sponsor or partner's code, the year they registered
 * (last two digits) and their place among sponsors and partners confirmed
 * from that year. Set the first time a record is confirmed; never reused.
 */
export function supporterNumber(row) {
  const n = Number(row?.number_no);
  const year = Number(row?.number_year);
  if (!row?.code || !Number.isInteger(n) || n < 1 || !Number.isInteger(year)) return "";
  return `HOR-${row.code}-${String(year % 100).padStart(2, "0")}-${String(n).padStart(4, "0")}`;
}

/** Whether a DB row may appear on the website. */
export function isPublic(row) {
  return row.status === "confirmed" && row.show_on_site && Boolean(row.logo) && Boolean(row.blurb);
}

/** DB row → what the website shows. Amounts only once the sponsor was told. */
export function publicSupporter(row, events = []) {
  const amounts = Boolean(row.amounts_agreed_at);
  return {
    slug: row.slug,
    kind: row.kind,
    name: row.name,
    label: row.category_label || null,
    tier: row.kind === "Sponsor" ? row.tier || null : null,
    tierLabel: row.kind === "Sponsor" ? tierLabel(row.tier) || null : null,
    logo: row.logo,
    blurb: row.blurb,
    website: row.website || null,
    instagram: row.instagram ? `https://www.instagram.com/${row.instagram}/` : null,
    gives: (row.gives || []).map(givesLabel).filter(Boolean),
    year: amounts ? row.support_year || null : null,
    cash: amounts ? row.cash_amount ?? null : null,
    inKind: amounts ? row.in_kind_value ?? null : null,
    inKindNote: row.in_kind_note || null,
    events,
  };
}

const formatPeso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;

/** "Gave ₱15,000 in cash and ₱6,000 in kind (treats) in 2026." or a plain line without amounts. */
export function gaveLine(s) {
  const parts = [];
  if (s.cash) parts.push(`${formatPeso(s.cash)} in cash`);
  if (s.inKind) parts.push(`${formatPeso(s.inKind)} in kind${s.inKindNote ? ` (${s.inKindNote})` : ""}`);
  if (parts.length) return `Gave ${parts.join(" and ")}${s.year ? ` in ${s.year}` : ""}.`;
  if (s.gives?.length) return `Gives ${s.gives.join(", ").toLowerCase()}${s.inKindNote ? `: ${s.inKindNote}` : ""}.`;
  return "";
}

/** Totals for the transparency bar: one year's public amounts. */
export function totals(list, year) {
  const sponsors = list.filter((s) => s.year === year);
  const events = new Set(list.flatMap((s) => s.events.map((e) => e.slug)));
  return {
    year,
    cash: sponsors.reduce((sum, s) => sum + (s.cash || 0), 0),
    inKind: sponsors.reduce((sum, s) => sum + (s.inKind || 0), 0),
    events: events.size,
  };
}

/** Sponsors by tier, highest first; untiered last. */
export function byTier(sponsors) {
  const groups = TIERS.map(([key, name]) => ({ key, name, items: sponsors.filter((s) => s.tier === key) }));
  groups.push({ key: "other", name: null, items: sponsors.filter((s) => !s.tier) });
  return groups.filter((g) => g.items.length);
}
