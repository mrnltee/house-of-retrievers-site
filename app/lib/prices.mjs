/**
 * Event prices. An event has up to MAX_TIERS tiers ("Early bird ₱500",
 * "Regular ₱795"); the card shows the range, the event page lists each tier.
 * Amounts are whole or decimal pesos; 0 means free.
 */

export const MAX_TIERS = 6;
export const MAX_AMOUNT = 1_000_000;

/** 1200 → "₱1,200"; 99.5 → "₱99.50". */
export function formatPeso(amount) {
  const whole = Number.isInteger(amount);
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** "₱1,200", "PHP 1200.00", "1,200" → 1200; anything else → null. */
export function parsePeso(text) {
  const cleaned = String(text ?? "").replace(/₱|php|p(?=\d)|,|\s/gi, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n <= MAX_AMOUNT ? n : null;
}

/**
 * Tiers as sent by the editor (a JSON string or an array) → a clean list.
 * Rows with no amount are dropped; labels are trimmed to 40 characters.
 * A tier can be on sale for a period (an early bird rate): optional `from`
 * and `until`, ISO instants the editor builds from Manila date + time. It can
 * also be limited to the first `limit` registrants (an early bird for the
 * first 20); after that it isn't offered and people take the other tiers.
 * In ticket-specific attendance mode, each tier also says whether it is for
 * people only or a furbaby package, including its people-per-dog allowance.
 * @returns {{ tiers?: {label: string, amount: number, from?: string, until?: string, limit?: number}[], error?: string }}
 */
export function cleanTiers(input, { pricingBasis = "registration" } = {}) {
  let rows = input;
  if (typeof input === "string") {
    try {
      rows = JSON.parse(input || "[]");
    } catch {
      return { error: "The prices didn't come through. Check them and save again." };
    }
  }
  if (!Array.isArray(rows)) return { tiers: [] };
  const tiers = [];
  for (const row of rows) {
    const label = String(row?.label ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    const raw = row?.amount;
    if (raw === "" || raw == null) continue;
    const amount = typeof raw === "number" ? raw : parsePeso(raw);
    if (amount == null || !Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) {
      return { error: `"${raw}" isn't a price. Use numbers only, like 500.` };
    }
    const tier = { label, amount: Math.round(amount * 100) / 100 };
    if (pricingBasis === "bundle") {
      const bundleHumans = Number(row?.bundleHumans ?? 0);
      const bundleFurbabies = Number(row?.bundleFurbabies ?? 0);
      if (!Number.isInteger(bundleHumans) || bundleHumans < 0 || bundleHumans > 100 || !Number.isInteger(bundleFurbabies) || bundleFurbabies < 0 || bundleFurbabies > 100 || (bundleHumans === 0 && bundleFurbabies === 0)) {
        return { error: `${label || "A bundle"} needs at least one included person or furbaby.` };
      }
      tier.bundleHumans = bundleHumans;
      tier.bundleFurbabies = bundleFurbabies;
    }
    // Free events do not present a ticket choice, so they need no attendance rule.
    if (pricingBasis === "tiered" && amount > 0) {
      const attendanceBasis = row?.attendanceBasis;
      if (attendanceBasis === "human_only") {
        tier.attendanceBasis = attendanceBasis;
      } else if (attendanceBasis === "furbaby_package") {
        const includedHumansPerFurbaby = Number(row?.includedHumansPerFurbaby ?? 2);
        const additionalHumanFee = row?.additionalHumanFee === "" || row?.additionalHumanFee == null
          ? 0
          : parsePeso(row.additionalHumanFee);
        if (!Number.isInteger(includedHumansPerFurbaby) || includedHumansPerFurbaby < 1 || includedHumansPerFurbaby > 100) {
          return { error: `${label || "A Furbaby package"} needs a whole number of included people from 1 to 100.` };
        }
        if (additionalHumanFee == null || !Number.isInteger(additionalHumanFee)) {
          return { error: `${label || "A Furbaby package"} needs a whole-peso extra-person fee.` };
        }
        tier.attendanceBasis = attendanceBasis;
        tier.includedHumansPerFurbaby = includedHumansPerFurbaby;
        tier.additionalHumanFee = additionalHumanFee;
      } else {
        return { error: `${label || "A ticket"} needs an attendance rule.` };
      }
    }
    for (const key of ["from", "until"]) {
      if (row?.[key] == null || row[key] === "") continue;
      const ms = Date.parse(row[key]);
      if (!Number.isFinite(ms)) return { error: `The ${key === "from" ? "start" : "end"} date of ${label || "a price"} didn't come through. Pick it again.` };
      tier[key] = new Date(ms).toISOString();
    }
    if (row?.limit != null && row.limit !== "") {
      const limit = Number(row.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 5000) return { error: `The limit for ${label || "a price"} should be a whole number of attendance units, like 20.` };
      tier.limit = limit;
    }
    if (tier.from && tier.until && Date.parse(tier.until) <= Date.parse(tier.from)) {
      return { error: `${label || "A price"} ends before it starts. Check its dates.` };
    }
    tiers.push(tier);
  }
  if (tiers.length > MAX_TIERS) return { error: `Up to ${MAX_TIERS} prices per event.` };
  return { tiers };
}

/**
 * What a card shows: "Free", "₱795", or "₱500 – ₱1,200" (lowest to highest).
 * @returns {string | null}
 */
export function priceSummary(tiers) {
  if (!tiers?.length) return null;
  const amounts = tiers.map((t) => t.amount);
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  const say = (n) => (n === 0 ? "Free" : formatPeso(n));
  return low === high ? say(low) : `${say(low)} – ${formatPeso(high)}`;
}

/**
 * Tiers for an event saved before tiers existed: "Free" or a plain amount
 * becomes one tier; any other text stays as it was typed (returns null).
 */
export function tiersFromCost(cost) {
  const text = String(cost ?? "").trim();
  if (!text) return [];
  if (/^free$/i.test(text)) return [{ label: "", amount: 0 }];
  const amount = parsePeso(text);
  return amount == null ? null : [{ label: "", amount }];
}

/**
 * Registrations already holding a tier are counted by label and amount
 * (what a registration stores). `counts` maps tierKey → number taken.
 */
export const tierKey = (tier) => `${tier?.label || ""}|${Number(tier?.amount ?? "")}`;

/** How many are left of a limited tier (null when it has no limit). */
export function tierLeft(tier, counts = {}) {
  if (!tier?.limit) return null;
  return Math.max(0, tier.limit - (counts[tierKey(tier)] || 0));
}

/** Whether a tier is on sale at `now`: inside its sale period and not sold out (no dates or limit = always). */
export function tierAvailable(tier, now = Date.now(), counts = {}) {
  if (tier?.from && now < Date.parse(tier.from)) return false;
  if (tier?.until && now >= Date.parse(tier.until)) return false;
  if (tier?.limit && tierLeft(tier, counts) <= 0) return false;
  return true;
}

/** The tiers on sale at `now`. */
export const activeTiers = (tiers, now = Date.now(), counts = {}) => (tiers || []).filter((t) => tierAvailable(t, now, counts));

/** Whether any tier has a sale period or a limit (so what's on sale changes over time). */
export const hasTierDates = (tiers) => (tiers || []).some((t) => t.from || t.until || t.limit);

const manila = (iso) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(d);
  return `${day}, ${time}`;
};

/**
 * A tier's sale period in words, for the event page and the editor:
 * "Until Oct 10, 11:59 PM", "From Nov 1, 12:00 AM", "Ended Oct 10", or "".
 */
export function tierWindow(tier, now = Date.now()) {
  if (tier?.until && now >= Date.parse(tier.until)) return `Ended ${manila(tier.until).split(",")[0]}`;
  if (tier?.from && now < Date.parse(tier.from)) return `From ${manila(tier.from)}`;
  if (tier?.until) return `Until ${manila(tier.until)}`;
  return "";
}
