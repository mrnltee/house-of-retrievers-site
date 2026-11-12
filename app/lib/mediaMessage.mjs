import { escHtml } from "./emailDesign.mjs";

/** Where media hub messages go (owner, 12 Nov 2026). */
export const MEDIA_MESSAGE_TO = "houseofretrieversph@gmail.com";

/** The kinds of message the media hub form offers. Keys are sent by the page buttons (`data-message`). */
export const MESSAGE_TYPES = [
  { key: "story", label: "Story idea" },
  { key: "inquiry", label: "Media inquiry" },
  { key: "interview", label: "Interview or media access" },
  { key: "partnership", label: "Partnership" },
  { key: "photos", label: "Photo or logo request" },
  { key: "other", label: "Something else" },
];

export const MESSAGE_LIMITS = { name: 120, email: 200, organization: 160, subject: 160, message: 5000 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const tidy = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** The type for a key, or the first ("Story idea") when it isn't one of ours. */
export function messageType(key) {
  return MESSAGE_TYPES.find((t) => t.key === key) || MESSAGE_TYPES[0];
}

/**
 * Checks what the form sent.
 * @returns {{ ok: true, value: {type, name, email, organization, subject, message} } | { ok: false, error: string }}
 */
export function cleanMediaMessage(body = {}) {
  const type = messageType(body.type).key;
  const name = tidy(body.name, MESSAGE_LIMITS.name);
  const email = tidy(body.email, MESSAGE_LIMITS.email).toLowerCase();
  const organization = tidy(body.organization, MESSAGE_LIMITS.organization);
  const subject = tidy(body.subject, MESSAGE_LIMITS.subject);
  const message = String(body.message ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MESSAGE_LIMITS.message);
  if (!name) return { ok: false, error: "Please add your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please add an email address we can reply to." };
  if (message.length < 10) return { ok: false, error: "Please write a little more in your message." };
  return { ok: true, value: { type, name, email, organization, subject, message } };
}

/** The email HOR receives: subject, HTML and plain text. Replies go straight to the sender. */
export function mediaMessageEmail({ type, name, email, organization, subject, message }) {
  const label = messageType(type).label;
  const from = organization ? `${name} (${organization})` : name;
  const title = `[Media hub · ${label}] ${subject || `Message from ${from}`}`.slice(0, 200);
  const rows = [["Type", label], ["From", name], ["Email", email], ["Organization / outlet", organization || "—"], ["Subject", subject || "—"]];
  const text = [...rows.map(([k, v]) => `${k}: ${v}`), "", message, "", "Sent from the media hub form at media.houseofretrieversph.org. Reply to this email to answer them."].join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0d0d0d">
<p style="margin:0 0 14px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7a5a1c"><strong>Media hub · ${escHtml(label)}</strong></p>
<table role="presentation" style="border-collapse:collapse;margin:0 0 18px">${rows.map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;color:#68665f;vertical-align:top">${escHtml(k)}</td><td style="padding:3px 0">${escHtml(v)}</td></tr>`).join("")}</table>
${message.split("\n\n").map((p) => `<p style="margin:0 0 12px">${escHtml(p).replace(/\n/g, "<br>")}</p>`).join("")}
<p style="margin:22px 0 0;font-size:12px;color:#68665f">Sent from the media hub form at media.houseofretrieversph.org. Reply to this email to answer ${escHtml(name)} directly.</p>
</div>`;
  return { subject: title, html, text };
}
