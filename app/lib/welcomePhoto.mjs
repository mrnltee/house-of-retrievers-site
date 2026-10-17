/**
 * The check-in welcome card: which photo it shows (the RSVP's own, the
 * matching People record's, or initials) and the message line under the name.
 * A wrong match is worse than initials, so when in doubt there is no match.
 */

import { can } from "./admin/roles.mjs";
import { normalizedIdentity } from "./registrationRecovery.mjs";

export const DEFAULT_WELCOME_MESSAGE = "Welcome in. Have a wonderful time together.";

export const WELCOME_PHOTO_SOURCE_LABELS = { own: "From their RSVP", people: "From their People profile", initials: "Initials" };

const KIND_RANK = { Member: 0, Volunteer: 1 };

export function initialsFor(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const letters = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return letters.map((word) => Array.from(word)[0].toLocaleUpperCase()).join("");
}

const firstName = (name) => normalizedIdentity(name).split(" ")[0];

/**
 * The People record an RSVP belongs to: same email and name; else the only
 * record with that email when it's plausibly the same household member (same
 * first name, or the same furbaby), and no other RSVP at this event shares it.
 */
export function pickPeopleMatch({ name, email, furbaby_name: furbaby }, candidates, { sharedEmail = false } = {}) {
  const sameEmail = (candidates || []).filter((c) => normalizedIdentity(c.email) === normalizedIdentity(email));
  const named = sameEmail.filter((c) => normalizedIdentity(c.name) === normalizedIdentity(name));
  const lone = !sharedEmail && sameEmail.length === 1 ? sameEmail[0] : null;
  const plausible = lone && (firstName(lone.name) === firstName(name)
    || (normalizedIdentity(furbaby) && normalizedIdentity(furbaby) === normalizedIdentity(lone.furbaby_name)));
  const pool = named.length ? named : plausible ? [lone] : [];
  if (!pool.length) return null;
  return [...pool].sort((a, b) => (a.photo_id ? 0 : 1) - (b.photo_id ? 0 : 1) || (KIND_RANK[a.kind] ?? 2) - (KIND_RANK[b.kind] ?? 2))[0];
}

/** `choice` is registrations.welcome_photo: null (automatic), "own" or "initials". */
export function pickWelcomePhoto({ choice, ownPhotoId, match }) {
  if (choice === "initials") return { source: "initials", photoId: null };
  if (choice === "own" && ownPhotoId) return { source: "own", photoId: ownPhotoId };
  if (match?.photo_id) return { source: "people", photoId: match.photo_id };
  return { source: "initials", photoId: null };
}

/** Never set → the default line; saved empty → no line. */
export function welcomeMessageLine(message) {
  if (message == null) return DEFAULT_WELCOME_MESSAGE;
  return String(message).trim();
}

/** Which changes make sense from here; "use their People photo" only when that photo exists. */
export function welcomePhotoOptions({ source, matchPhotoId }) {
  return { useProfile: Boolean(matchPhotoId) && source !== "people", showInitials: source !== "initials" };
}

export const canSeeWelcomePhoto = (roles) => can(roles, "checkin") || can(roles, "registrations:view");
