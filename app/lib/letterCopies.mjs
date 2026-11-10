/**
 * Extra CC / BCC addresses typed on the letter send page (owner, 10 Nov 2026).
 * They go on every recipient's email in that send, on top of a guest's own
 * representative CC. Each recipient still gets their own email, so a copied
 * address receives one copy per recipient.
 */

export const MAX_COPIES = 5;

const looksLikeEmail = (v) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(v);

/** "a@x.ph, b@y.com" (commas, semicolons, spaces or new lines) → { emails } or { error }. */
export function parseCopies(text, label = "CC") {
  const parts = String(text ?? "").split(/[\s,;]+/).map((p) => p.trim().replace(/^<|>$/g, "")).filter(Boolean);
  const seen = new Set();
  const emails = [];
  for (const part of parts) {
    if (!looksLikeEmail(part)) return { emails: [], error: `${label}: “${part.slice(0, 60)}” doesn't look like an email address.` };
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(part);
  }
  if (emails.length > MAX_COPIES) return { emails: [], error: `${label}: ${MAX_COPIES} addresses at most.` };
  return { emails };
}

/**
 * The CC and BCC for one recipient: their own CC plus the extra CC, then the
 * extra BCC, never repeating the To address or an address already copied.
 */
export function copiesFor({ to = "", cc = [] } = {}, extraCc = [], extraBcc = []) {
  const seen = new Set([String(to).toLowerCase()].filter(Boolean));
  const take = (list) => list.filter((email) => {
    const key = String(email).toLowerCase();
    if (!looksLikeEmail(email) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const outCc = take([...cc, ...extraCc]);
  const outBcc = take(extraBcc);
  return { cc: outCc, bcc: outBcc };
}
