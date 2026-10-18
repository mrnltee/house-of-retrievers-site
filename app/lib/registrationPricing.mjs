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
  ["tiered", "Ticket-specific attendance rules"],
  ["base_plus", "Base (1 hooman + 1 furbaby) + extras"],
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

/** Validates a ticket rule used by the ticket-specific attendance mode. */
export function cleanTieredTicketRule(input = {}) {
  const attendanceBasis = input?.attendanceBasis;
  if (attendanceBasis === "human_only") return { attendanceBasis };
  if (attendanceBasis !== "furbaby_package") return { error: "Choose whether this ticket is Hooman only or a Furbaby package." };

  const includedHumansPerFurbaby = Number(input?.includedHumansPerFurbaby ?? 2);
  const additionalHumanFee = input?.additionalHumanFee === "" || input?.additionalHumanFee == null
    ? 0
    : Number(String(input.additionalHumanFee).replace(/₱|php|p(?=\d)|,|\s/gi, ""));
  if (!Number.isInteger(includedHumansPerFurbaby) || includedHumansPerFurbaby < 1 || includedHumansPerFurbaby > 100) {
    return { error: "People included per furbaby should be a whole number from 1 to 100." };
  }
  if (!Number.isInteger(additionalHumanFee) || additionalHumanFee < 0 || additionalHumanFee > 1_000_000) {
    return { error: "The extra-person fee should be a whole number from 0 to 1,000,000 pesos." };
  }
  return { attendanceBasis, includedHumansPerFurbaby, additionalHumanFee };
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

/** Units consumed by a first-N ticket limit for one registration. */
export function ticketLimitUnits(basis, tier = {}, humans = 1, furbabies = 0) {
  const key = cleanPricingBasis(basis);
  if (key === "human_plus_furbaby" || key === "human") return humans;
  if (key === "furbaby") return furbabies;
  if (key === "tiered") return tier.attendanceBasis === "furbaby_package" ? furbabies : humans;
  if (key === "base_plus") return tier.limitUnit === "furbabies" ? furbabies : tier.limitUnit === "hoomans" ? humans : 1;
  return 1;
}

export function ticketLimitUnitLabel(basis, tier = {}) {
  const key = cleanPricingBasis(basis);
  if (key === "human_plus_furbaby" || key === "human") return "hoomans";
  if (key === "furbaby") return "furbabies";
  if (key === "tiered") return tier.attendanceBasis === "furbaby_package" ? "furbabies" : "hoomans";
  if (key === "base_plus" && (tier.limitUnit === "furbabies" || tier.limitUnit === "hoomans")) return tier.limitUnit;
  return "registrations";
}

/** An event's "most per registration" setting from the editor → 1–20, or null for no limit. */
export function cleanAttendeeLimit(value) {
  const n = Number(value);
  if (value === "" || value == null || !Number.isInteger(n) || n < 1) return null;
  return Math.min(n, 20);
}

/**
 * The public RSVP's attendee rules: per-furbaby pricing needs a furbaby, and
 * an event can cap furbabies per registration and people per furbaby.
 * @returns {{ error?: string }}
 */
export function checkAttendeeLimits({ basis, humans, furbabies, maxFurbabies = null, maxHumansPerFurbaby = null }) {
  if (cleanPricingBasis(basis) === "furbaby" && furbabies < 1) return { error: "Add at least one furbaby. This event's price is per furbaby." };
  if (maxFurbabies && furbabies > maxFurbabies) {
    return { error: `You can register up to ${maxFurbabies} ${maxFurbabies === 1 ? "furbaby" : "furbabies"} per RSVP. For more, please send another RSVP.` };
  }
  if (maxHumansPerFurbaby && furbabies > 0 && humans > maxHumansPerFurbaby * furbabies) {
    const most = maxHumansPerFurbaby * furbabies;
    return { error: `This event allows up to ${most} ${most === 1 ? "person" : "people"} for ${furbabies} ${furbabies === 1 ? "furbaby" : "furbabies"}.` };
  }
  return {};
}

/** The RSVP's line for a first-N ticket: "First 20 registrants · 3 left". */
export function ticketLimitLine(basis, tier = {}, left) {
  const unit = ticketLimitUnitLabel(basis, tier);
  return `First ${tier.limit} ${unit === "registrations" ? "registrants" : unit} · ${left} left`;
}

/** Returns the total in whole pesos, or an error when a bundle is incomplete. */
export function calculateAmountDue({ basis = "registration", tier = {}, humans = 1, furbabies = 0, includedFurbabiesPerHuman = 0, additionalFurbabyFee = 0 } = {}) {
  if (cleanPricingBasis(basis) === "base_plus" && tier.attendanceBasis === "human_only") {
    if (furbabies > 0) return { error: "This Hooman only ticket cannot include a furbaby. Choose a ticket with a furbaby instead." };
    return { quantity: humans, amount: Math.round(Number(tier.amount || 0) * humans) };
  }
  if (cleanPricingBasis(basis) === "base_plus") {
    // The base covers one hooman and one furbaby; each extra uses this tier's own fee.
    const extraHumans = Math.max(0, humans - 1);
    const extraFurbabies = Math.max(0, furbabies - 1);
    return {
      quantity: 1,
      extraHumans,
      extraFurbabies,
      amount: Math.round(Number(tier.amount || 0)) + extraHumans * Number(tier.extraHumanFee || 0) + extraFurbabies * Number(tier.extraFurbabyFee || 0),
    };
  }
  if (cleanPricingBasis(basis) === "tiered") {
    const rule = cleanTieredTicketRule(tier);
    if (rule.error) return rule;
    if (rule.attendanceBasis === "human_only") {
      if (furbabies > 0) return { error: "This Hooman only ticket cannot include a furbaby. Choose a Furbaby package instead." };
      return { quantity: humans, amount: Math.round(Number(tier.amount || 0) * humans) };
    }
    if (furbabies < 1) return { error: "Add at least one furbaby for this Furbaby package." };
    const extraHumans = Math.max(0, humans - furbabies * rule.includedHumansPerFurbaby);
    return {
      quantity: furbabies,
      extraHumans,
      amount: Math.round(Number(tier.amount || 0) * furbabies) + extraHumans * rule.additionalHumanFee,
    };
  }
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
  if (key === "tiered") return tier.attendanceBasis === "human_only" ? "Hooman only" : "Furbaby package";
  if (key === "base_plus") return tier.attendanceBasis === "human_only" ? "Hooman only" : "1 hooman + 1 furbaby, extras added";
  return "Per registration";
}
