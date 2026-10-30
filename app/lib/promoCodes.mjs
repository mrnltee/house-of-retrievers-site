/**
 * Promo codes per event (owner, 2026-10-31): a keyword people type when they
 * register, for either a % off the total or one free unit (one hooman,
 * furbaby or pair at the ticket's rate; the rest stay at the regular rate).
 * Each code may have a sale period (Manila dates) and a total number of uses.
 */
export const MAX_PROMO_CODES = 20;
export const PROMO_KINDS = { percent: "% off", free_one: "1 free" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "golden 20" → "GOLDEN20": letters, numbers and dashes, case doesn't matter. */
export function normalizeCode(text) {
  return String(text || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 30);
}

/** Admin input (JSON or array) → { codes } or { error }. */
export function cleanPromoCodes(input) {
  let list = input;
  if (typeof input === "string") {
    try { list = input.trim() ? JSON.parse(input) : []; } catch { return { error: "The promo codes couldn't be read. Refresh and try again." }; }
  }
  if (!Array.isArray(list)) return { codes: [] };
  if (list.length > MAX_PROMO_CODES) return { error: `Up to ${MAX_PROMO_CODES} promo codes per event.` };
  const codes = [];
  const seen = new Set();
  for (const raw of list) {
    const code = normalizeCode(raw?.code);
    if (!code && !raw?.percent && !raw?.limit) continue;
    if (code.length < 3) return { error: "Each promo code needs at least 3 letters or numbers." };
    if (seen.has(code)) return { error: `The promo code ${code} is listed twice.` };
    seen.add(code);
    const kind = raw?.kind === "free_one" ? "free_one" : "percent";
    const percent = kind === "percent" ? Math.round(Number(raw?.percent)) : null;
    if (kind === "percent" && !(percent >= 1 && percent <= 100)) return { error: `Set a discount from 1 to 100% for ${code}.` };
    const from = DATE.test(String(raw?.from || "")) ? raw.from : null;
    const until = DATE.test(String(raw?.until || "")) ? raw.until : null;
    if (from && until && from > until) return { error: `${code}: the start date is after the end date.` };
    const limitText = String(raw?.limit ?? "").trim();
    const limit = limitText ? Math.round(Number(limitText)) : null;
    if (limit != null && !(limit >= 1 && limit <= 100000)) return { error: `${code}: the number of uses must be 1 or more, or left blank for no limit.` };
    codes.push({ code, kind, percent, from, until, limit });
  }
  return { codes };
}

/** The event's code matching what was typed, or null. */
export function findPromo(codes, text) {
  const code = normalizeCode(text);
  if (!code || !Array.isArray(codes)) return null;
  return codes.find((c) => normalizeCode(c?.code) === code) || null;
}

/** Why a code can't be used now ("" when it can). `today` is the Manila date, YYYY-MM-DD. */
export function promoProblem(promo, { today, used = 0 } = {}) {
  if (!promo) return "That promo code isn't valid for this event.";
  if (promo.from && today < promo.from) return "That promo code isn't active yet.";
  if (promo.until && today > promo.until) return "That promo code has expired.";
  if (promo.limit != null && used >= promo.limit) return "That promo code has been fully used.";
  return "";
}

/**
 * The discount on an amount due (from calculateAmountDue) for a ticket:
 * % off the total, or one unit at the ticket's rate, never more than the total.
 */
export function applyPromo(promo, due, tier) {
  const total = Math.max(0, Math.round(Number(due?.amount) || 0));
  if (!promo) return { discount: 0, amount: total };
  const raw = promo.kind === "free_one"
    ? ((due?.quantity ?? 1) >= 1 ? Math.round(Number(tier?.amount) || 0) : 0)
    : Math.round((total * Number(promo.percent || 0)) / 100);
  const discount = Math.min(total, Math.max(0, raw));
  return { discount, amount: total - discount };
}

/** "20% off" / "1 free" (what the code gives, in words). */
export function promoLabel(promo) {
  if (!promo) return "";
  return promo.kind === "free_one" ? "1 free" : `${promo.percent}% off`;
}

/** What a registration keeps of its code, so later recalculations give the same discount. */
export const promoSnapshot = (promo) => (promo ? { code: normalizeCode(promo.code), kind: promo.kind, percent: promo.percent ?? null } : null);
