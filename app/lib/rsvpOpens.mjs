/**
 * Scheduled RSVP opening: an event can take RSVPs from a set moment (Manila
 * time). Until then the events pages show a countdown instead of the RSVP
 * button, and /api/rsvp turns sign-ups away. Pure functions, shared by the
 * editor, the public pages, the route and the tests.
 */

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ""));

/** "2026-11-01" + "12:00" (Manila) → ISO instant, or null when either is missing or malformed. */
export function manilaInstant(date, time) {
  if (!isDate(date) || !isTime(time)) return null;
  const ms = Date.parse(`${date}T${time}:00+08:00`);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** ISO instant → { date: "2026-11-01", time: "12:00" } in Manila, for the editor's inputs. */
export function manilaParts(iso) {
  const ms = Date.parse(iso || "");
  if (!Number.isFinite(ms)) return { date: "", time: "" };
  const shifted = new Date(ms + 8 * 3600 * 1000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/** "Sat, Nov 1 · 12:00 PM" (Manila). */
export function formatOpens(iso) {
  const ms = Date.parse(iso || "");
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(d);
  return `${day} · ${time}`;
}

/** Whether RSVPs are still waiting for their opening moment. */
export function opensLater(iso, now = Date.now()) {
  const ms = Date.parse(iso || "");
  return Number.isFinite(ms) && now < ms;
}

/** Milliseconds left → { days, hours, minutes, seconds } (never negative). */
export function countdownParts(msLeft) {
  let s = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(s / 86400); s -= days * 86400;
  const hours = Math.floor(s / 3600); s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  return { days, hours, minutes, seconds: s - minutes * 60 };
}

/**
 * The editor's fields → { value: ISO | null } or { error }. `endsAt` is when
 * the event ends (ms); RSVPs have to open before that.
 */
export function readOpensAt(input, endsAt = Infinity) {
  const on = input?.rsvpOpensOn === true || input?.rsvpOpensOn === "on";
  if (!on) return { value: null };
  const iso = manilaInstant(input?.rsvpOpensDate, input?.rsvpOpensTime);
  if (!iso) return { error: "Pick the date and time RSVPs open." };
  if (Date.parse(iso) >= endsAt) return { error: "RSVPs have to open before the event ends." };
  return { value: iso };
}
