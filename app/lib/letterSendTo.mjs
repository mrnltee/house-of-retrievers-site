/**
 * Sending a letter to someone else for one send (owner, 10 Nov 2026): a brand
 * may want a proposal to go to a specific person, without changing the email
 * or contact person saved on their record. On the send page each recipient can
 * get another email and, optionally, the name the letter is addressed to.
 */

export const SEND_TO_NAME_MAX = 120;

const looksLikeEmail = (v) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(v);

/**
 * The send page's `sendTo` JSON ({ ref: { email, contact } }) → { byRef } for
 * the refs being sent, or { error } naming the first bad address. Rows with
 * no email are ignored (that recipient goes to the address on record).
 */
export function readSendTo(json, refs = []) {
  let raw = {};
  try { raw = typeof json === "string" ? JSON.parse(json || "{}") : json || {}; } catch { return { byRef: {}, error: "The other email addresses couldn't be read. Reload the page and try again." }; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { byRef: {} };
  const allowed = new Set(refs);
  const byRef = {};
  for (const [ref, value] of Object.entries(raw)) {
    if (!allowed.has(ref) || !value || typeof value !== "object") continue;
    const email = String(value.email ?? "").trim();
    if (!email) continue;
    if (!looksLikeEmail(email) || email.length > 254) return { byRef: {}, error: `“${email.slice(0, 60)}” doesn't look like an email address.` };
    const contact = String(value.contact ?? "").replace(/\s+/g, " ").trim().slice(0, SEND_TO_NAME_MAX);
    byRef[ref] = { email, contact };
  }
  return { byRef };
}

/**
 * A recipient sent elsewhere for this send: the other email in place of the
 * one on record and, with a name, that person as the contact and greeting.
 * Their saved record is not touched. Without an override, unchanged.
 */
export function withSendTo(recipient, override) {
  const email = String(override?.email ?? "").trim();
  if (!recipient || !email || !looksLikeEmail(email)) return recipient;
  const contact = String(override?.contact ?? "").trim();
  return {
    ...recipient,
    email,
    onRecord: recipient.email || "",
    ...(contact ? { contact, salutation: contact } : {}),
  };
}
