/** Recurring seasonal branding rules. Dates are interpreted in Asia/Manila. */

export const THEME_VARIANTS = ["default", "halloween", "holiday", "sparkling", "new-year", "valentines"];

export const DEFAULT_THEMES = [
  { id: "halloween", label: "Halloween", starts_month: 10, starts_day: 1, ends_month: 11, ends_day: 2, logo_variant: "halloween", splash_variant: "halloween", welcome_text: "A little spooky, always good-hearted.", enabled: true, priority: 10 },
  { id: "holiday", label: "Christmas", starts_month: 11, starts_day: 3, ends_month: 12, ends_day: 25, logo_variant: "holiday", splash_variant: "holiday", welcome_text: "Warm wishes from the House.", enabled: true, priority: 10 },
  { id: "sparkling", label: "Sparkling", starts_month: 11, starts_day: 30, ends_month: 11, ends_day: 30, logo_variant: "sparkling", splash_variant: "sparkling", welcome_text: "A little extra sparkle for good things ahead.", enabled: true, priority: 20 },
  { id: "new-year", label: "New Year", starts_month: 12, starts_day: 26, ends_month: 1, ends_day: 8, logo_variant: "new-year", splash_variant: "new-year", welcome_text: "Welcome 2028.", enabled: true, priority: 20 },
  { id: "valentines", label: "Valentine's", starts_month: 2, starts_day: 1, ends_month: 2, ends_day: 15, logo_variant: "valentines", splash_variant: "valentines", welcome_text: "More love. More good we can do together.", enabled: true, priority: 10 },
];

const number = (value, fallback = 0) => Number.isInteger(Number(value)) ? Number(value) : fallback;

/** Manila's current month and day without turning a calendar date into UTC. */
export function manilaMonthDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", month: "numeric", day: "numeric" }).formatToParts(now);
  return { month: Number(parts.find((part) => part.type === "month")?.value), day: Number(parts.find((part) => part.type === "day")?.value) };
}

const dayOfYear = (month, day) => month * 32 + day;

/** True when a month/day window is active, including windows across New Year. */
export function isThemeActive(theme, now = new Date()) {
  if (!theme?.enabled) return false;
  const current = dayOfYear(...Object.values(manilaMonthDay(now)));
  const start = dayOfYear(number(theme.starts_month), number(theme.starts_day));
  const end = dayOfYear(number(theme.ends_month), number(theme.ends_day));
  return start <= end ? current >= start && current <= end : current >= start || current <= end;
}

/** The winning theme: enabled, active, then highest priority. */
export function activeTheme(themes = DEFAULT_THEMES, now = new Date()) {
  return themes.filter((theme) => isThemeActive(theme, now)).sort((a, b) => number(b.priority) - number(a.priority))[0] || null;
}

export function cleanTheme(row) {
  if (!row) return null;
  return {
    id: String(row.id || ""),
    label: String(row.label || ""),
    starts_month: number(row.starts_month),
    starts_day: number(row.starts_day),
    ends_month: number(row.ends_month),
    ends_day: number(row.ends_day),
    logo_variant: THEME_VARIANTS.includes(row.logo_variant) ? row.logo_variant : "default",
    splash_variant: THEME_VARIANTS.includes(row.splash_variant) ? row.splash_variant : "default",
    welcome_text: String(row.welcome_text || "").trim(),
    enabled: row.enabled !== false,
    priority: number(row.priority),
  };
}

export function publicTheme(row) {
  const clean = cleanTheme(row);
  return clean ? { id: clean.id, label: clean.label, logoVariant: clean.logo_variant, splashVariant: clean.splash_variant, welcomeText: clean.welcome_text } : null;
}

/** Admin form validation. Month/day are recurring; invalid calendar combinations are rejected. */
export function validateTheme(input) {
  const value = {
    id: String(input?.id || "").trim(),
    label: String(input?.label || "").trim(),
    startsMonth: Number(input?.startsMonth),
    startsDay: Number(input?.startsDay),
    endsMonth: Number(input?.endsMonth),
    endsDay: Number(input?.endsDay),
    logoVariant: THEME_VARIANTS.includes(input?.logoVariant) ? input.logoVariant : "default",
    splashVariant: THEME_VARIANTS.includes(input?.splashVariant) ? input.splashVariant : "default",
    welcomeText: String(input?.welcomeText || "").trim(),
    enabled: input?.enabled === true || input?.enabled === "on" || input?.enabled === "true",
    priority: Number(input?.priority || 0),
  };
  if (!/^[a-z0-9-]{1,40}$/.test(value.id)) return { error: "That theme has an invalid id." };
  if (!value.label || value.label.length > 80) return { error: "Give the theme a short name." };
  for (const [name, month, day] of [["start", value.startsMonth, value.startsDay], ["end", value.endsMonth, value.endsDay]]) {
    const max = new Date(Date.UTC(2024, month, 0)).getUTCDate();
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > max) return { error: `The ${name} date is not valid.` };
  }
  if (!Number.isInteger(value.priority) || value.priority < 0 || value.priority > 100) return { error: "Priority must be between 0 and 100." };
  if (value.welcomeText.length > 120) return { error: "The welcome message is too long." };
  return { value };
}
