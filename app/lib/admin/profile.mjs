/**
 * Admin profiles (owner, 2026-10-31): how a person's name shows in the
 * sidebar and elsewhere. "Full name", or "First name / Furbaby"
 * (e.g. "Shey / Macchiato"); initials stand in for a missing photo.
 * Pure functions, so they can be tested.
 */
import { ROLE_LABELS } from "./roles.mjs";

export const PROFILE_LIMITS = { name: 120, firstName: 60, furbabyName: 60 };
export const SHOW_AS = [
  ["full", "Full name"],
  ["first", "First name / furbaby"],
];

const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const emailName = (email) => String(email || "").split("@")[0];

/** "Shey Santos" → "Shey". */
export const firstNameOf = (name) => clean(name, PROFILE_LIMITS.name).split(" ")[0] || "";

/** The name to show: "Shey Santos", "Shey / Macchiato", "Shey", else the email's name part. */
export function displayName(admin = {}) {
  const full = clean(admin.name, PROFILE_LIMITS.name);
  const first = clean(admin.first_name, PROFILE_LIMITS.firstName) || firstNameOf(full);
  const furbaby = clean(admin.furbaby_name, PROFILE_LIMITS.furbabyName);
  if (admin.show_as === "first" && first) return furbaby ? `${first} / ${furbaby}` : first;
  return full || first || emailName(admin.email);
}

/** Up to two initials from the person's own name: "Shey Santos" → "SS". */
export function initialsOf(admin = {}) {
  const words = (clean(admin.name, PROFILE_LIMITS.name) || clean(admin.first_name, 60) || emailName(admin.email)).split(/[\s._-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] || "?").slice(0, 2)).toUpperCase();
}

/** The line under the name: their roles, or "Admin" for someone given chosen pages. */
export function roleLine(admin = {}) {
  const roles = Array.isArray(admin.roles) ? admin.roles : [];
  if (roles.includes("owner")) return ROLE_LABELS.owner;
  if (Array.isArray(admin.pages)) return "Admin";
  return roles.map((r) => ROLE_LABELS[r] || r).join(", ") || "No role yet";
}

/** Profile form → { profile } or { error }. */
export function cleanProfile(input = {}) {
  const name = clean(input.name, PROFILE_LIMITS.name);
  if (!name) return { error: "Type your full name." };
  const showAs = SHOW_AS.some(([k]) => k === input.showAs) ? input.showAs : "full";
  return {
    profile: {
      name,
      firstName: clean(input.firstName, PROFILE_LIMITS.firstName) || firstNameOf(name),
      furbabyName: clean(input.furbabyName, PROFILE_LIMITS.furbabyName) || null,
      showAs,
    },
  };
}
