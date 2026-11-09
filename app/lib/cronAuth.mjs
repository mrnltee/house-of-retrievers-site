import { timingSafeEqual } from "node:crypto";

/**
 * True only for Vercel's own scheduled call: `Authorization: Bearer <CRON_SECRET>`.
 * With no CRON_SECRET set (local, previews) every call is refused, so a cron
 * route can never be run by a stranger because a variable went missing.
 * Vercel only schedules crons on production, where CRON_SECRET is set.
 */
export function isCronAuthorized(headers, secret = process.env.CRON_SECRET) {
  if (!secret) return false;
  const given = Buffer.from(String(headers?.get?.("authorization") || ""));
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
