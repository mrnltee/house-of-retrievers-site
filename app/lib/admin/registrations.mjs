import { randomBytes } from "node:crypto";

/**
 * RSVP rules: who gets a confirmed slot, who waits, and the check-in code on
 * each confirmation.
 */

const clean = (value, max = 120) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "");
const yes = (value) => value === true || value === "yes" || value === "true" || value === "on";
const no = (value) => value === false || value === "no" || value === "false";

/**
 * @returns {{ value?: {name, email, furbabyName, photoConsent, under18, guardianName}, error?: string }}
 */
export function validateRsvp(input) {
  const name = clean(input?.name);
  const email = clean(input?.email, 200).toLowerCase();
  if (!name) return { error: "We'll need your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "We'll need a valid email address." };
  // Photo consent is an explicit choice either way, never a default.
  if (!yes(input?.photoConsent) && !no(input?.photoConsent)) return { error: "Tell us whether photos of you are OK." };
  const under18 = yes(input?.under18);
  const guardianName = clean(input?.guardianName) || null;
  if (under18 && !guardianName) return { error: "Under 18s come with a parent or guardian. Add their name." };
  return {
    value: {
      name,
      email,
      furbabyName: clean(input?.furbabyName) || null,
      photoConsent: yes(input?.photoConsent),
      under18,
      guardianName: under18 ? guardianName : null,
    },
  };
}

/** A new registration is confirmed while there's room, otherwise waitlisted. */
export function statusForNewRegistration({ capacity, confirmed }) {
  if (capacity == null) return "confirmed";
  return confirmed < capacity ? "confirmed" : "waitlist";
}

/** Unambiguous characters only (no 0/O, 1/I/L), so a code can be read aloud at the door. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newCheckInCode(length = 10) {
  // Bytes at or above the largest multiple of the alphabet size are skipped,
  // so every character is equally likely.
  const limit = 256 - (256 % ALPHABET.length);
  let code = "";
  while (code.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < limit && code.length < length) code += ALPHABET[byte % ALPHABET.length];
    }
  }
  return code;
}

export function normalizeCode(value) {
  const code = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return [...code].every((ch) => ALPHABET.includes(ch)) && code.length === 10 ? code : "";
}

/**
 * Check-in outcome for a scanned code.
 * @returns {"ok" | "already" | "not-confirmed" | "wrong-event" | "unknown"}
 */
export function checkInOutcome(registration, eventId) {
  if (!registration) return "unknown";
  if (registration.event_id !== eventId) return "wrong-event";
  if (registration.status !== "confirmed") return "not-confirmed";
  if (registration.checked_in_at) return "already";
  return "ok";
}
