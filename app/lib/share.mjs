/**
 * Sharing an event: its public address, the caption people paste into
 * Instagram, and the "share to" links for Facebook, X and Threads.
 * Instagram has no web share link, so it gets a copied caption instead.
 */
import { EVENTS_URL } from "./eventsHost.mjs";

export const eventUrl = (slug) => `${EVENTS_URL}/${slug}`;

/** "2026-10-11" → "Sun, 11 Oct 2026", read as a calendar date (no timezone drift). */
export function formatEventDate(isoDate) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** "07:00" → "7:00 AM". */
export function formatTime(value) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function formatWhen(event) {
  const time = [event.startTime, event.endTime].filter(Boolean).map(formatTime).join("–");
  return [formatEventDate(event.date), time].filter(Boolean).join(" · ");
}

const tagLine = (event) => (event.hashtags || []).map((tag) => `#${tag}`).join(" ");

function shorten(text, max, { keepParagraphs = false } = {}) {
  const flat = keepParagraphs
    ? String(text || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
    : String(text || "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** The full caption: for Instagram, Facebook posts, group chats. */
export function shareCaption(event) {
  const lines = [
    event.title,
    `📅 ${formatWhen(event)}`,
    `📍 ${[event.venue, event.city].filter(Boolean).join(", ")}`,
  ];
  if (event.supports) lines.push(`💛 For ${event.supports}`);
  if (event.summary) lines.push("", shorten(event.summary, 600, { keepParagraphs: true }));
  lines.push("", `${event.rsvp ? "Details and RSVP" : "Details"}: ${eventUrl(event.slug)}`);
  const tags = tagLine(event);
  if (tags) lines.push("", tags);
  return lines.join("\n");
}

/** A short line for X and Threads, which add the link themselves or show it. */
export function shareLine(event, max = 200) {
  const base = `${event.title} · ${formatEventDate(event.date)} · ${[event.venue, event.city].filter(Boolean).join(", ")}`;
  let line = shorten(base, max);
  for (const tag of event.hashtags || []) {
    if (line.length + tag.length + 2 > max) break;
    line += ` #${tag}`;
  }
  return line;
}

/** The share-to links. Each opens that site's own "new post" screen; nothing is posted without the person's say. */
export function shareLinks(event) {
  const url = eventUrl(event.slug);
  return [
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { id: "x", label: "X", href: `https://x.com/intent/post?${new URLSearchParams({ text: shareLine(event, 230), url })}` },
    { id: "threads", label: "Threads", href: `https://www.threads.net/intent/post?${new URLSearchParams({ text: `${shareLine(event, 400)}\n${url}` })}` },
  ];
}
