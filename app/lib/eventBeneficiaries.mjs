/**
 * Beneficiaries per event (owner, 2026-11-01): a charity event picks its
 * beneficiaries from the Beneficiaries list, so the event page can show
 * participants where their support goes. Pure functions, so they can be tested.
 */

/** ["A", "B", "C"] → "A, B and C" (the event's "For" line). */
export function supportsLine(names = []) {
  const list = names.map((n) => String(n || "").trim()).filter(Boolean);
  if (list.length <= 1) return list[0] || "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** Ticked ids that are on the list, once each, in the order ticked. */
export function pickedIds(values = [], allowed = []) {
  const ok = new Set(allowed);
  return [...new Set(values.filter((v) => ok.has(v)))];
}
