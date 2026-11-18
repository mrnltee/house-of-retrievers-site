/**
 * Speakers and special guests on an event page (owner, 17 Nov 2026).
 *
 * They come from the event's Guest list. A guest shows only when HoR has switched "Show on the event page"
 * on AND they replied Coming; what shows is the name, the role and intro typed for this event, a picture
 * uploaded for the public page, and one link. Never their email, phone, notes, representative or the
 * guest list's private photo.
 */

/** Suggested roles, in the order the event page lists them (others typed by HoR come after). */
export const SPEAKER_ROLES = ["Keynote speaker", "Guest speaker", "Speaker", "Panelist", "Host", "Organizer", "Co-organizer", "Co-host", "Special guest", "Performer", "Judge"];

export const ROLE_MAX = 40;
export const INTRO_MAX = 200;

const tidy = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** An https link, or an @handle turned into an Instagram link; anything else is dropped. */
export function cleanSpeakerLink(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const handle = raw.match(/^@([A-Za-z0-9._]{1,30})$/);
  if (handle) return `https://www.instagram.com/${handle[1]}/`;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname.includes(".") ? url.href.slice(0, 300) : "";
  } catch {
    return "";
  }
}

/** The public fields from the guest-list form. */
export function cleanSpeaker({ show, role, intro, link } = {}) {
  return {
    show: show === true || show === "1" || show === "on",
    role: tidy(role, ROLE_MAX),
    intro: tidy(intro, INTRO_MAX),
    link: cleanSpeakerLink(link),
  };
}

/** Whether a guest-list row may appear on the public event page. */
export function isPublicSpeaker(row) {
  return Boolean(row?.show_on_site && row.reply === "yes" && String(row.name || "").trim());
}

/** A short label for a link: "Instagram", "Facebook", "TikTok", "Website". */
export function linkLabel(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (/instagram\.com$/.test(host)) return "Instagram";
    if (/facebook\.com$/.test(host)) return "Facebook";
    if (/tiktok\.com$/.test(host)) return "TikTok";
    if (/(^|\.)x\.com$|twitter\.com$/.test(host)) return "X";
    if (/threads\.(net|com)$/.test(host)) return "Threads";
    if (/linkedin\.com$/.test(host)) return "LinkedIn";
    return "Website";
  } catch {
    return "Website";
  }
}

const roleRank = (role) => {
  const i = SPEAKER_ROLES.findIndex((r) => r.toLowerCase() === String(role || "").toLowerCase());
  return i === -1 ? SPEAKER_ROLES.length : i;
};

/** The public shape, from a guest-list row joined with its contact. */
export function publicSpeaker(row) {
  const link = cleanSpeakerLink(row.public_link);
  return {
    id: row.contact_id || row.id,
    name: tidy(row.name, 120),
    role: tidy(row.public_role, ROLE_MAX) || "Special guest",
    intro: tidy(row.public_intro, INTRO_MAX) || null,
    photo: /^\/api\/event-image\/[0-9a-f-]{36}$/i.test(String(row.public_photo || "")) ? row.public_photo : null,
    link: link || null,
    linkLabel: link ? linkLabel(link) : null,
  };
}

/** Speakers first by role (keynote, guest speaker, speaker, host, special guest…), then by name. */
export function sortSpeakers(list) {
  return [...list].sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name));
}

/** The section title: "Speakers", "Special guests", or "Speakers & special guests". */
export function speakersTitle(list) {
  const speaks = (s) => /speaker|host|panelist/i.test(s.role);
  const anySpeaker = list.some(speaks);
  const anyGuest = list.some((s) => !speaks(s));
  if (anySpeaker && anyGuest) return "Speakers & special guests";
  return anySpeaker ? (list.length === 1 ? "Speaker" : "Speakers") : list.length === 1 ? "Special guest" : "Special guests";
}

/** Initials for a guest without a picture. */
export function initialsOf(name) {
  return String(name || "").split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}
