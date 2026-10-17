/**
 * Check-ins entered by hand after the fact (a guest who wasn't scanned, or the
 * internet was down and the door kept a paper list). They're allowed even
 * when payment or the acknowledgement is missing: the guest was there.
 */

import { manilaInstant } from "./rsvpOpens.mjs";

/** How long the door's welcome card stays before it goes back to scanning. */
export const WELCOME_COUNTDOWN_SECONDS = 5;

/** The arrival time typed in the admin (Manila) → ISO, or an error. */
export function readCheckInTime({ date, time }, { eventDate, now = new Date() }) {
  const iso = manilaInstant(date, time);
  if (!iso) return { error: "Enter the date and time they arrived." };
  if (Date.parse(iso) > new Date(now).getTime()) return { error: "That time is in the future. Enter when they actually arrived." };
  const dayStart = manilaInstant(String(eventDate).slice(0, 10), "00:00");
  if (dayStart && Date.parse(iso) < Date.parse(dayStart)) return { error: "That time is before the event's day. Check the date." };
  return { value: iso };
}

/** What the confirm dialog mentions; none of these stop a hand check-in. */
export function manualCheckInWarnings(reg) {
  const warnings = [];
  if (reg.fee_required && reg.fee_status !== "paid" && reg.fee_status !== "not_due") warnings.push("Payment not confirmed");
  if (reg.rsvp_form_config?.consentEnabled && !reg.consent_completed_at) warnings.push("Event acknowledgement not completed");
  return warnings;
}
