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
 * and `until`, ISO instants the editor builds from Manila date + time.
 * @returns {{ tiers?: {label: string, amount: number, from?: string, until?: string}[], error?: string }}
 */
export function cleanTiers(input) {
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
    for (const key of ["from", "until"]) {
      if (row?.[key] == null || row[key] === "") continue;
      const ms = Date.parse(row[key]);
      if (!Number.isFinite(ms)) return { error: `The ${key === "from" ? "start" : "end"} date of ${label || "a price"} didn't come through. Pick it again.` };
      tier[key] = new Date(ms).toISOString();
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

/** Whether a tier is on sale at `now` (no dates = always). */
export function tierAvailable(tier, now = Date.now()) {
  if (tier?.from && now < Date.parse(tier.from)) return false;
  if (tier?.until && now >= Date.parse(tier.until)) return false;
  return true;
}

/** The tiers on sale at `now`. */
export const activeTiers = (tiers, now = Date.now()) => (tiers || []).filter((t) => tierAvailable(t, now));

/** Whether any tier has a sale period. */
export const hasTierDates = (tiers) => (tiers || []).some((t) => t.from || t.until);

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
