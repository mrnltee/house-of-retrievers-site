/**
 * "Add to calendar" for an event: a Google Calendar link and an .ics file
 * (Apple Calendar, Outlook and most phones). Times are Manila local time.
 */

const TZ = "Asia/Manila";

const compactDate = (date) => date.replaceAll("-", "");
const compactTime = (time) => `${time.replace(":", "")}00`;

/** "13:00" + 2 hours → "15:00", without crossing midnight. */
function laterBy(time, hours) {
  const [h, m] = time.split(":").map(Number);
  return `${String(Math.min(23, h + hours)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** The day after "2026-10-17" → "20261018" (all-day events end the next day). */
function nextDay(date) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

function span(event) {
  if (!event.startTime) return { allDay: true, start: compactDate(event.date), end: nextDay(event.date) };
  const end = event.endTime && event.endTime > event.startTime ? event.endTime : laterBy(event.startTime, 2);
  return { allDay: false, start: `${compactDate(event.date)}T${compactTime(event.startTime)}`, end: `${compactDate(event.date)}T${compactTime(end)}` };
}

export function eventLocation(event) {
  return [event.venue, event.venueAddress, event.city].filter(Boolean).join(", ");
}

/** A Google Calendar "add event" link. */
export function googleCalendarUrl(event, url) {
  const { start, end } = span(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    ctz: TZ,
    location: eventLocation(event),
    details: [event.summary?.slice(0, 600), url].filter(Boolean).join("\n\n"),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const escape = (text) => String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds lines longer than 75 octets, as the iCalendar format asks. */
function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

/** The .ics file's text. `now` is injectable for tests. */
export function icsFile(event, url, now = new Date()) {
  const { allDay, start, end } = span(event);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//House of Retrievers//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // Manila has no daylight saving: one fixed offset is the whole zone.
    "BEGIN:VTIMEZONE",
    `TZID:${TZ}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0800",
    "TZOFFSETTO:+0800",
    "TZNAME:PHT",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${event.slug}@houseofretrieversph.org`,
    `DTSTAMP:${stamp}`,
    allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART;TZID=${TZ}:${start}`,
    allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND;TZID=${TZ}:${end}`,
    `SUMMARY:${escape(event.title)}`,
    `LOCATION:${escape(eventLocation(event))}`,
    `DESCRIPTION:${escape([event.summary?.slice(0, 600), url].filter(Boolean).join("\n\n"))}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
