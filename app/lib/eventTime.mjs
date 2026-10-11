/**
 * When an event is over, in Manila time. An event moves to "Where we have
 * been" (and stops taking RSVPs) once it has ended, not the day after:
 * - with an end time: at the end time;
 * - with only a start time: three hours after it starts (same day at the latest);
 * - all day, or no times: at midnight that night.
 */

const pad = (n) => String(n).padStart(2, "0");

/** Milliseconds since epoch when the event ends; Infinity when the date is unreadable. */
export function eventEndsAt(event) {
  const date = String(event?.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Infinity;
  const midnight = Date.parse(`${date}T00:00:00+08:00`) + 24 * 3600 * 1000;
  if (event.allDay) return midnight;
  if (event.endTime) return Date.parse(`${date}T${event.endTime}:00+08:00`);
  if (event.startTime) {
    const [h, m] = event.startTime.split(":").map(Number);
    return Math.min(Date.parse(`${date}T${pad(h)}:${pad(m)}:00+08:00`) + 3 * 3600 * 1000, midnight);
  }
  return midnight;
}

export function hasEnded(event, now = Date.now()) {
  return now >= eventEndsAt(event);
}
