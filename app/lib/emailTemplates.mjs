/**
 * The emails the site sends, as { subject, html, text }. Plain words, one
 * clear action each, the reverse logo on an ink band. Pure functions: no
 * sending here (see app/lib/email.js), so they can be tested and previewed.
 *
 * Voice: warm but grounded (see the content voice notes). Never promise a
 * date, a reply time or a benefit HOR hasn't set.
 */
import { HOME_URL } from "./siteSeo.mjs";
import { EVENTS_URL } from "./eventsHost.mjs";
import { formatWhen } from "./share.mjs";

const ORG = "The House of Retrievers Society Inc.";
/**
 * The header is one image: the reverse logo already on its ink band
 * (public/email/header.png, 1120×238, shown at 560 wide). Gmail's dark mode
 * recolours backgrounds but never images, so a CSS band would flip to light
 * and hide the white Labrador and wordmark; a baked band can't.
 */
const HEADER = `${HOME_URL}/email/header.png`;

/**
 * Dark mode for the apps that ask (Apple Mail, Outlook.com, iOS Mail). Gmail
 * ignores this and inverts colours itself; the layout is built to survive that.
 */
const DARK_CSS = `:root{color-scheme:light dark;supported-color-schemes:light dark}
@media (prefers-color-scheme:dark){
  .em-bg{background:#26231e!important}
  .em-card{background:#161512!important}
  .em-h1{color:#F5F1E6!important}
  .em-p{color:#e4dfd2!important}
  .em-foot{color:#b3ad9f!important;border-top-color:#2e2b25!important}
  .em-link{color:#D9B66A!important}
}`;

const esc = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "there";

/**
 * The shared frame. Tables and inline styles, because email apps ignore most
 * of CSS; widths and colours match the site (ink #0D0D0D, ivory #F5F1E6, gold #A78440).
 */
function frame({ preheader, heading, paragraphs, button, after = [], footnote }) {
  const p = (text) => `<p class="em-p" style="margin:0 0 16px;font:16px/1.6 Helvetica,Arial,sans-serif;color:#2b2a27">${text}</p>`;
  const cta = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:999px;background:#A78440">
         <a href="${esc(button.href)}" style="display:inline-block;padding:14px 26px;font:700 15px Helvetica,Arial,sans-serif;color:#0D0D0D;text-decoration:none;border-radius:999px">${esc(button.label)}</a>
       </td></tr></table>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(heading)}</title><style>${DARK_CSS}</style></head>
<body class="em-bg" style="margin:0;padding:0;background:#F5F1E6">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="em-bg" style="background:#F5F1E6"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="em-card" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
    <tr><td style="background:#0D0D0D;padding:0;line-height:0"><img src="${HEADER}" width="560" alt="${ORG}" style="display:block;border:0;width:100%;max-width:560px;height:auto"></td></tr>
    <tr><td style="padding:32px 28px 12px">
      <h1 class="em-h1" style="margin:0 0 18px;font:400 30px/1.15 Georgia,'Times New Roman',serif;color:#0D0D0D">${esc(heading)}</h1>
      ${paragraphs.map(p).join("\n      ")}
      ${cta}
      ${after.map(p).join("\n      ")}
    </td></tr>
    <tr><td class="em-foot" style="padding:18px 28px 26px;border-top:1px solid #ede7d8;font:13px/1.55 Helvetica,Arial,sans-serif;color:#6b6960">
      ${footnote ? `${footnote}<br><br>` : ""}${ORG} · <a class="em-link" href="${HOME_URL}" style="color:#7A5C1F">houseofretrieversph.org</a><br>Reply to this email to reach the team.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** The plain-text twin every email needs (some apps show only this; spam filters check for it). */
function plain({ heading, paragraphs, button, after = [], footnote }) {
  const strip = (html) => String(html).replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return [heading, "", ...paragraphs.map(strip).flatMap((x) => [x, ""]), ...(button ? [`${button.label}: ${button.href}`, ""] : []), ...after.map(strip).flatMap((x) => [x, ""]), footnote ? strip(footnote) : "", `${ORG} · ${HOME_URL}`, "Reply to this email to reach the team."].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function build(parts) {
  return { subject: parts.subject, html: frame(parts), text: plain(parts) };
}

const NEXT_STEP = {
  Member: "Someone from the team will get in touch to welcome you and add you to the members' group chat. You don't need to do anything else for now.",
  Volunteer: "Someone from the team will get in touch about upcoming events where an extra pair of hands helps. You don't need a dog to volunteer.",
  Partner: "Someone from the team will get in touch to talk about what working together could look like.",
  Sponsor: "Someone from the team will get in touch to talk about the events and causes you'd like to support.",
};

/** Sent straight away when someone sends the Join form. */
export function applicationReceived({ name, kind, again = false }) {
  const role = { Member: "member", Volunteer: "volunteer", Partner: "partner", Sponsor: "sponsor" }[kind] || "member";
  return build({
    subject: again ? "We got your update" : `Thanks for joining House of Retrievers, ${firstName(name)}`,
    preheader: again ? "We've added it to what you sent before." : `We have your ${role} application.`,
    heading: again ? `Got it, ${firstName(name)}.` : `Thanks, ${firstName(name)}. We have your application.`,
    paragraphs: [
      again
        ? `You sent the Join form again, so we've added your new details to your ${role} application.`
        : `You asked to join House of Retrievers as a ${role}. It's with the team now.`,
      NEXT_STEP[kind] || NEXT_STEP.Member,
    ],
    button: { label: "See upcoming events", href: EVENTS_URL },
    footnote: "You're getting this because this email address was entered on the Join form at houseofretrieversph.org. If that wasn't you, reply and we'll remove it.",
  });
}

/** Sent when an admin confirms a member. */
export function welcomeMember({ name, memberNo }) {
  return build({
    subject: `Welcome to House of Retrievers, ${firstName(name)}`,
    preheader: memberNo ? `You're member ${memberNo}.` : "You're in.",
    heading: `Welcome to the pack, ${firstName(name)}.`,
    paragraphs: [
      `You're now a member of House of Retrievers${memberNo ? `. Your member number is <strong>${esc(memberNo)}</strong>` : ""}.`,
      "Events are where it all happens: runs, care visits, workshops and fundraisers. RSVP on the events page with this email address and you'll get your pass straight away.",
    ],
    button: { label: "See upcoming events", href: EVENTS_URL },
    after: ["There is always room for one more good human. Thanks for being one."],
    footnote: "You're getting this because you joined House of Retrievers.",
  });
}

/** Sent when someone RSVPs (or joins the waitlist) on the events page. */
export function rsvpConfirmed({ name, event, status, passUrl, feeRequired }) {
  const waitlist = status === "waitlist";
  const when = formatWhen(event);
  const where = [event.venue, event.city].filter(Boolean).join(", ");
  return build({
    subject: waitlist ? `You're on the waitlist: ${event.title}` : `You're going: ${event.title}`,
    preheader: `${when} · ${where}`,
    heading: waitlist ? `You're on the waitlist, ${firstName(name)}.` : `See you there, ${firstName(name)}.`,
    paragraphs: [
      `<strong>${esc(event.title)}</strong><br>${esc(when)}<br>${esc(where)}`,
      waitlist
        ? "The event is full right now. If a spot opens, we'll email you, and your pass below will show it."
        : "Show your pass at the door. It has a QR code the team scans to check you in.",
      ...(feeRequired && !waitlist ? ["This event has a fee, paid by QR before the day. The team will confirm once it's in."] : []),
    ],
    button: { label: waitlist ? "Open my waitlist pass" : "Open my pass", href: passUrl },
    after: ["Can't make it after all? Reply to this email so someone else can have the spot."],
    footnote: `You're getting this because this email address was used to RSVP at ${EVENTS_URL.replace("https://", "")}.`,
  });
}
