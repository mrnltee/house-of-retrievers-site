/**
 * The event Guest tracker (owner, 17 Nov 2026), built like the Brand tracker: one list of an event's
 * guests with search, reply filters, sort, ticks to send one letter to several, and each guest's own
 * Invite, Follow up and Message buttons, all opening the send window.
 */
import { letterFor } from "./contacts.mjs";

/** The email-only follow-up for guests who haven't replied (a built-in starter, editable on Letters). */
export const GUEST_FOLLOW_UP_LETTER = "guest-follow-up";

const sendHref = (base, eventId, key, refs, extra = []) => {
  const params = new URLSearchParams([["letter", key], ["event", eventId], ["list", "guests"], ...extra]);
  for (const ref of refs) params.append("to", ref);
  return `${base}/letters/send?${params}`;
};

/** A guest's invite letter: this event's own letter when it has one, else their category's letter. */
export function guestInviteLetter(row, { eventLetter = "", chosen = {} } = {}) {
  return eventLetter || letterFor(row.category, chosen);
}

/**
 * One guest's own buttons. `invite` sends their invite letter; `followUp` (email only) shows while they
 * are on No reply yet and an invite already went out (`sent`); `message` opens the send window on
 * "Write my own email" (`own=1`), for anything else: directions, a schedule change, a thank-you.
 */
export function guestRowLinks(base, eventId, row, inviteLetter, { sent = false } = {}) {
  const ref = [`contact:${row.id}`];
  return {
    invite: sendHref(base, eventId, inviteLetter, ref),
    followUp: row.reply === "waiting" && sent ? sendHref(base, eventId, GUEST_FOLLOW_UP_LETTER, ref) : "",
    message: sendHref(base, eventId, GUEST_FOLLOW_UP_LETTER, ref, [["own", "1"]]),
  };
}

/** "Follow up · N" in the page head: every guest still on No reply yet who has already had an invite. */
export function guestFollowUpLink(base, eventId, rows = [], wasSent = () => false) {
  const waiting = rows.filter((r) => r.reply === "waiting" && wasSent(r));
  if (!waiting.length) return { href: "", count: 0, noEmail: 0 };
  return {
    href: sendHref(base, eventId, GUEST_FOLLOW_UP_LETTER, waiting.map((r) => `contact:${r.id}`)),
    count: waiting.length,
    noEmail: waiting.filter((r) => !r.email && !r.rep_email).length,
  };
}

/** "Send a message" for the ticked guests: the same own-email window, for whoever is ticked. */
export function guestMessageBase(base, eventId) {
  return sendHref(base, eventId, GUEST_FOLLOW_UP_LETTER, [], [["own", "1"]]);
}
