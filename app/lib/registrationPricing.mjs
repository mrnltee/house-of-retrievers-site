/**
 * Price calculations for an event registration. The default basis is the
 * existing one-ticket-per-registration behavior.
 */

export const PRICING_BASES = [
  ["registration", "One ticket per registration"],
  ["human", "Per person"],
  ["furbaby", "Per furbaby"],
  ["bundle", "Human + furbaby bundle"],
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
    case "furbaby": return furbabies;
    case "bundle": return bundleQuantity(tier, humans, furbabies);
    default: return 1;
  }
}

/** Returns the total in whole pesos, or an error when a bundle is incomplete. */
export function calculateAmountDue({ basis = "registration", tier = {}, humans = 1, furbabies = 0 } = {}) {
  const quantity = pricingQuantity(basis, tier, humans, furbabies);
  if (quantity == null) return { error: "This bundle needs at least one included person or furbaby." };
  return { quantity, amount: Math.round(Number(tier.amount || 0) * quantity) };
}

export function pricingLabel(basis, tier = {}) {
  const key = cleanPricingBasis(basis);
  if (key === "human") return "Per person";
  if (key === "furbaby") return "Per furbaby";
  if (key === "bundle") return `${tier.bundleHumans || 0} person + ${tier.bundleFurbabies || 0} furbaby bundle`;
  return "Per registration";
}
