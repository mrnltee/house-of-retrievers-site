/**
 * A furbaby's age in years (owner, 10 Nov 2026; migration 100), shown in
 * parentheses after the name, "Mochi (3 yrs)", with the human-years
 * equivalent on hover. Optional; stored per furbaby by position as text,
 * "" where not given (like breeds and genders).
 *
 * Months for puppies (26 Nov 2026, owner, from user feedback): the forms let
 * people type the age in years or in months. It is still stored in years, so
 * saved ages, the CSV and the human-years bubble are unchanged; under a year
 * it keeps two decimals so every whole month comes back as itself
 * (3 months = 0.25, shown "3 mo"), where one decimal turned 3 months into 4.
 */

export const MAX_AGE = 30;
export const AGE_UNITS = ["years", "months"];

/** "3", "2.5", " 0.5 " → the age in years (one decimal; two under a year), or null when blank or out of range. */
export function readAge(value) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AGE) return null;
  const rounded = Math.round(n * 10) / 10;
  return rounded < 1 ? Math.max(0.01, Math.round(n * 100) / 100) : rounded;
}

/**
 * What a person typed in the age field (an amount and "years" or "months") →
 * the age in years as saved, "" when blank or out of range. 18 months is 1.5.
 */
export function ageFromParts(amount, unit = "years") {
  const text = String(amount ?? "").trim().replace(",", ".");
  if (!text) return "";
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return "";
  const age = readAge(unit === "months" ? n / 12 : n);
  return age == null ? "" : String(age);
}

/** A saved age → how the field shows it: months under a year ({amount: "6", unit: "months"}), else years. */
export function ageParts(value) {
  const n = readAge(value);
  if (n == null) return { amount: "", unit: "years" };
  if (n < 1) return { amount: String(Math.max(1, Math.round(n * 12))), unit: "months" };
  return { amount: String(n), unit: "years" };
}

/** One age per furbaby ("" where not given), or null when none was given. */
export function cleanAges(input, furbabies) {
  const list = (Array.isArray(input) ? input : input == null ? [] : [input]).slice(0, Math.max(0, Number(furbabies) || 0));
  const clean = list.map((value) => { const age = readAge(value); return age == null ? "" : String(age); });
  return clean.some(Boolean) ? clean : null;
}

/**
 * About how old in human years, after the AVMA's rule of thumb for a
 * medium-sized dog: 15 for the first year, 9 more for the second, then 5 a year.
 */
export function humanYears(age) {
  const n = readAge(age);
  if (n == null) return null;
  if (n <= 1) return Math.round(15 * n);
  if (n <= 2) return Math.round(15 + 9 * (n - 1));
  return Math.round(24 + 5 * (n - 2));
}

/** "6 mo", "1 yr", "2.5 yrs". */
export function ageLabel(age) {
  const n = readAge(age);
  if (n == null) return "";
  if (n < 1) return `${Math.max(1, Math.round(n * 12))} mo`;
  return `${n} ${n === 1 ? "yr" : "yrs"}`;
}

/** "About 28 in human years". */
export function humanYearsLabel(age) {
  const h = humanYears(age);
  return h == null ? "" : `About ${h} in human years`;
}

/**
 * A People record's ages today: the ages given on `recordedOn` plus the time
 * since, down to the half year (3 given a year ago is 4 now). A furbaby over
 * the rainbow bridge keeps the age given.
 */
export function agesToday(ages, recordedOn, { rainbow = [], now = new Date() } = {}) {
  if (!Array.isArray(ages)) return ages ?? null;
  const since = recordedOn ? (now.getTime() - new Date(recordedOn).getTime()) / (365.25 * 24 * 3600 * 1000) : 0;
  const grow = Number.isFinite(since) && since > 0 ? since : 0;
  return ages.map((value, i) => {
    const age = readAge(value);
    if (age == null || rainbow?.[i] || !grow) return age == null ? "" : String(age);
    const grown = age + grow;
    const shown = grown < 1 ? Math.round(grown * 100) / 100 : Math.max(age, Math.floor(grown * 2) / 2);
    return String(Math.min(MAX_AGE, shown));
  });
}
