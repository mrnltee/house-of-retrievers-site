/**
 * GA4 call-to-action events (26 Nov 2026, owner). The tag itself is loaded in
 * `app/layout.jsx`; this only sends events when it is there, so ad blockers,
 * previews without the tag and tests are unaffected.
 *
 * Every tracked button sends one `cta_click` event with a stable `cta_name`
 * ("mission_support") and the `section` it sits in. Mark `cta_click` as a key
 * event in GA4 (Admin → Events) to count it as a conversion.
 */

/** Keeps names GA4-safe: lowercase letters, digits and underscores, at most 40 characters. */
export function cleanEventValue(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

/** The parameters sent with a `cta_click` event, or null when there is no name. */
export function ctaEventParams(name, section, extra = {}) {
  const cta = cleanEventValue(name);
  if (!cta) return null;
  const params = { cta_name: cta };
  const where = cleanEventValue(section);
  if (where) params.section = where;
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null && value !== "") params[cleanEventValue(key)] = String(value).slice(0, 100);
  }
  return params;
}

/** Sends a `cta_click` event to GA4 if the tag is loaded. Never throws. */
export function trackCta(name, section, extra) {
  const params = ctaEventParams(name, section, extra);
  if (!params || typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", "cta_click", params);
  } catch {
    // Analytics must never break a button.
  }
}
