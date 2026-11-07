import { UNPAID } from "./eventPayments.mjs";

/** Most reminders in one send: each email takes a moment, and the page must finish. */
export const MAX_REMINDERS_PER_SEND = 60;

/**
 * Can this registration be emailed the event reminder? It carries the pass,
 * so it needs a confirmed spot, and on a paid event a confirmed payment.
 * Returns { ok: true } or { ok: false, reason }.
 */
export function reminderEligibility(reg, { feeRequired = false } = {}) {
  if (reg.deleted_at) return { ok: false, reason: "Deleted" };
  if (reg.status === "waitlist") return { ok: false, reason: "On the waitlist" };
  if (reg.status !== "confirmed") return { ok: false, reason: "Cancelled" };
  if (feeRequired && UNPAID.includes(reg.fee_status)) return { ok: false, reason: "Payment not confirmed yet" };
  if (!reg.email) return { ok: false, reason: "No email address" };
  return { ok: true };
}

/** The ids the form sent, only uuids, no repeats, capped. */
export function readReminderIds(values) {
  const seen = new Set();
  for (const value of values || []) {
    const id = String(value || "").toLowerCase();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) seen.add(id);
  }
  return [...seen];
}

/** A short stable fingerprint of the wording, so the same text sent twice the same day isn't emailed twice. */
export function wordingKey(fields) {
  const text = [fields.subject, fields.greeting, fields.heading, fields.message, fields.details ?? ""].join("\u0001");
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Where "Send a test" goes: HOR's own inbox (owner, 7 Nov 2026), never a participant. */
export const REMINDER_TEST_TO = "houseofretrieversph@gmail.com";
