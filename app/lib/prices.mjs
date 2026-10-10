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
 * @returns {{ tiers?: {label: string, amount: number}[], error?: string }}
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
    tiers.push({ label, amount: Math.round(amount * 100) / 100 });
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
