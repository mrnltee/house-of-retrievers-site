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

/**
 * Typing in the CC / BCC chip field (owner, 26 Nov 2026): each address becomes
 * its own chip, like an event's Partners and Sponsors. A comma, semicolon,
 * space or new line ends an address; whatever follows the last one stays as
 * the draft being typed. Repeats (any case) are dropped.
 * → { chips, draft }
 */
export function splitCopyDraft(chips = [], text = "") {
  const parts = String(text ?? "").split(/[\s,;]+/);
  const draft = parts.pop() ?? "";
  const out = [...chips];
  for (const raw of parts) {
    const part = raw.trim().replace(/^<|>$/g, "");
    if (part && !out.some((c) => c.toLowerCase() === part.toLowerCase())) out.push(part);
  }
  return { chips: out, draft };
}

/** True when a chip is a usable address (a bad one is shown in red). */
export const isCopyEmail = (v) => looksLikeEmail(String(v ?? ""));
