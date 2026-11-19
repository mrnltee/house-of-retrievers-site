/**
 * HoR's own inbox is copied in on every email the site sends (owner, 19 Nov 2026): Join replies, RSVP passes and
 * payment emails, reminders, letters, invitation cards, media messages, templates and tests. It goes as a CC, so
 * the recipient sees HoR is on the thread (it is also the reply-to address). EMAIL_COPY_TO overrides the address;
 * set it to "off" to stop copying. Nothing is added when the email is already going to that inbox.
 */
export const HOR_INBOX = "houseofretrieversph@gmail.com";

const norm = (email) => String(email || "").trim().toLowerCase();

export function horCopyAddress(env = process.env) {
  const value = env.EMAIL_COPY_TO;
  if (value == null || String(value).trim() === "") return HOR_INBOX;
  return /^(off|none|no)$/i.test(String(value).trim()) ? "" : String(value).trim();
}

/** { to, cc, bcc } with HoR's inbox added to cc once, unless it's already the recipient or already copied. */
export function withHorCopy({ to, cc = [], bcc = [] }, address = horCopyAddress()) {
  const ccList = [...(cc || [])];
  let bccList = [...(bcc || [])];
  const copy = norm(address);
  if (!copy) return { cc: ccList, bcc: bccList };
  const toList = (Array.isArray(to) ? to : [to]).map(norm);
  if (toList.includes(copy) || ccList.some((e) => norm(e) === copy)) return { cc: ccList, bcc: bccList };
  // A BCC to the same inbox would only duplicate the CC.
  bccList = bccList.filter((e) => norm(e) !== copy);
  return { cc: [...ccList, address], bcc: bccList };
}
