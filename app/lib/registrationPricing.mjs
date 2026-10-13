/**
 * Price calculations for an event registration. The default basis is the
 * existing one-ticket-per-registration behavior.
 */

export const PRICING_BASES = [
  ["registration", "One ticket per registration"],
  ["human", "Per person"],
  ["furbaby", "Per furbaby"],
  ["bundle", "Human + furbaby bundle"],
  ["human_plus_furbaby", "Per person + dog companion"],
];

const BASIS_KEYS = new Set(PRICING_BASES.map(([key]) => key));

export function cleanPricingBasis(value) {
  return BASIS_KEYS.has(value) ? value : "registration";
}

export function cleanAttendeeCounts(humans, furbabies) {
  const people = Number(humans);
  const dogs = Number(furbabies);
  if (!Number.isInteger(people) || people < 1 || people > 100) return { error: "Add at least one person, up to 100." };
  if (!Number.isInteger(dogs) || dogs < 0 || dogs > 100) return { error: "Furbabies should be a whole number from 0 to 100." };
  return { humans: people, furbabies: dogs };
}

export function cleanFurbabyPricing(included, extraFee) {
  const includedCount = included === "" || included == null ? 0 : Number(included);
  const fee = extraFee === "" || extraFee == null ? 0 : Number(String(extraFee).replace(/₱|php|p(?=\d)|,|\s/gi, ""));
  if (!Number.isInteger(includedCount) || includedCount < 0 || includedCount > 100) return { error: "Included furbabies should be a whole number from 0 to 100." };
  if (!Number.isInteger(fee) || fee < 0 || fee > 1_000_000) return { error: "The additional furbaby fee should be a whole number from 0 to 1,000,000 pesos." };
  return { includedFurbabiesPerHuman: includedCount, additionalFurbabyFee: fee };
}

function bundleQuantity(tier, humans, furbabies) {
  const includedHumans = Number(tier?.bundleHumans || 0);
  const includedFurbabies = Number(tier?.bundleFurbabies || 0);
  if (includedHumans < 0 || includedFurbabies < 0 || (includedHumans === 0 && includedFurbabies === 0)) return null;
  const humanBundles = includedHumans ? Math.ceil(humans / includedHumans) : 0;
  const furbabyBundles = includedFurbabies ? Math.ceil(furbabies / includedFurbabies) : 0;
  return Math.max(humanBundles, furbabyBundles, 1);
}

export function pricingQuantity(basis, tier, humans = 1, furbabies = 0) {
  switch (cleanPricingBasis(basis)) {
    case "human": return humans;
    case "human_plus_furbaby": return humans;
    case "furbaby": return furbabies;
    case "bundle": return bundleQuantity(tier, humans, furbabies);
    default: return 1;
  }
}

/** Returns the total in whole pesos, or an error when a bundle is incomplete. */
export function calculateAmountDue({ basis = "registration", tier = {}, humans = 1, furbabies = 0, includedFurbabiesPerHuman = 0, additionalFurbabyFee = 0 } = {}) {
  const quantity = pricingQuantity(basis, tier, humans, furbabies);
  if (quantity == null) return { error: "This bundle needs at least one included person or furbaby." };
  const pricing = cleanFurbabyPricing(includedFurbabiesPerHuman, additionalFurbabyFee);
  if (pricing.error) return pricing;
  const extraFurbabies = cleanPricingBasis(basis) === "human_plus_furbaby"
    ? Math.max(0, furbabies - humans * pricing.includedFurbabiesPerHuman)
    : 0;
  const result = { quantity, amount: Math.round(Number(tier.amount || 0) * quantity) + extraFurbabies * pricing.additionalFurbabyFee };
  if (cleanPricingBasis(basis) === "human_plus_furbaby") result.extraFurbabies = extraFurbabies;
  return result;
}

/**
 * A paid registration may be recalculated only when its existing payment
 * already matches the new amount. This protects paid records from accidental
 * changes while allowing an admin to repair an attendee-count snapshot.
 */
export function paidAmountChangeAllowed({ oldDue, nextDue, payAmount } = {}) {
  if (Number(nextDue) === Number(oldDue)) return true;
  return payAmount != null && Number(payAmount) === Number(nextDue);
}

export function pricingLabel(basis, tier = {}) {
  const key = cleanPricingBasis(basis);
  if (key === "human") return "Per person";
  if (key === "human_plus_furbaby") return "Per person + dog companion";
  if (key === "furbaby") return "Per furbaby";
  if (key === "bundle") return `${tier.bundleHumans || 0} person + ${tier.bundleFurbabies || 0} furbaby bundle`;
  return "Per registration";
}
