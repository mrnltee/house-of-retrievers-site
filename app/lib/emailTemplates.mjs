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
/** Same band with the logo centered, and a small logo badge for the sign-off. */
const HEADER_CENTER = `${HOME_URL}/email/header-center.png`;
const BADGE = `${HOME_URL}/email/badge.png`;

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
function frame({ preheader, greeting, heading, paragraphs, button, after = [], signoff = SIGNOFF, footnote, centered = true }) {
  const p = (text) => `<p class="em-p" style="margin:0 0 16px;font:16px/1.6 Helvetica,Arial,sans-serif;color:#2b2a27">${text}</p>`;
  const sign = signoff
    ? `<p class="em-p" style="margin:24px 0 16px;font:16px/1.6 Helvetica,Arial,sans-serif;color:#2b2a27">${signoff.join("<br>")}</p>`
    : "";
  // The centered layout closes with the small logo badge and the org's full name.
  const foot = centered
    ? `<tr><td class="em-foot" align="center" style="padding:24px 28px 28px;border-top:1px solid #ede7d8;font:13px/1.55 Helvetica,Arial,sans-serif;color:#6b6960;text-align:center">
      <img src="${BADGE}" width="174" height="85" alt="${ORG}" style="display:block;margin:0 auto 12px;border:0">
      THORSI · ${ORG}<br>Reply to this email to reach the team.${footnote ? `<br><br>${footnote}` : ""}
    </td></tr>`
    : `<tr><td class="em-foot" style="padding:18px 28px 26px;border-top:1px solid #ede7d8;font:13px/1.55 Helvetica,Arial,sans-serif;color:#6b6960">
      ${footnote ? `${footnote}<br><br>` : ""}${ORG} · <a class="em-link" href="${HOME_URL}" style="color:#7A5C1F">houseofretrieversph.org</a><br>Reply to this email to reach the team.
    </td></tr>`;
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
    <tr><td style="background:#0D0D0D;padding:0;line-height:0"><img src="${centered ? HEADER_CENTER : HEADER}" width="560" alt="${ORG}" style="display:block;border:0;width:100%;max-width:560px;height:auto"></td></tr>
    <tr><td style="padding:32px 28px 12px">
      ${greeting ? p(esc(greeting)) : ""}
      <h1 class="em-h1" style="margin:0 0 18px;font:400 30px/1.15 Georgia,'Times New Roman',serif;color:#0D0D0D">${esc(heading)}</h1>
      ${paragraphs.map(p).join("\n      ")}
      ${cta}
      ${after.map(p).join("\n      ")}
      ${sign}
    </td></tr>
    ${foot}
  </table>
</td></tr></table>
</body></html>`;
}

/** The plain-text twin every email needs (some apps show only this; spam filters check for it). */
function plain({ greeting, heading, paragraphs, button, after = [], signoff = SIGNOFF, footnote, centered = true }) {
  const strip = (html) => String(html).replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const ending = centered
    ? [`THORSI · ${ORG}`, "Reply to this email to reach the team.", "", footnote ? strip(footnote) : ""]
    : [footnote ? strip(footnote) : "", `${ORG} · ${HOME_URL}`, "Reply to this email to reach the team."];
  return [
    ...(greeting ? [greeting, ""] : []),
    heading, "",
    ...paragraphs.map(strip).flatMap((x) => [x, ""]),
    ...(button ? [`${button.label}: ${button.href}`, ""] : []),
    ...after.map(strip).flatMap((x) => [x, ""]),
    ...(signoff ? [signoff.map(strip).join("\n"), ""] : []),
    ...ending,
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim();
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

/** HOR's sign-off, used on every email (from the registrant welcome HOR supplied). */
const SIGNOFF = [
  "With love and purpose,",
  `<strong>${ORG}</strong>`,
  "<em>Paws for a Purpose</em>",
  `<a class="em-link" href="${HOME_URL}" style="color:#7A5C1F">www.houseofretrieversph.org</a>`,
];

/**
 * Emails HOR can reword in the admin (Email templates). Each has a subject,
 * an optional greeting, a heading and a message; {{variables}} are filled in
 * per person. The frame (logo band, sign-off, footer) and any fixed parts
 * (an event's details, the pass button) stay as they are. These defaults are
 * HOR's own wording, used until someone saves their own.
 */
export const TEMPLATE_VARIABLES = {
  first_name: "First name, e.g. Juan",
  full_name: "Full name, e.g. Juan dela Cruz",
  furbaby_name: "Their dog's name from the Join form (blank if none)",
  organization: "Their organisation from the Join form (blank if none)",
  role: "member, volunteer, partner or sponsor",
  member_no: "Their number, e.g. HOR-26-0001 for a member or HORV-26-0001 for a volunteer (once Active)",
  event_title: "The event's name",
  event_date: "Date and time, e.g. Sat, Oct 17, 2026 · 1:00 PM–4:00 PM",
  event_venue: "Venue and city",
};

const RECEIVED_FOOTNOTE = "You're getting this because this email address was entered on the Join form at houseofretrieversph.org. If that wasn't you, reply and we'll remove it.";
const EVENTS_BUTTON = { label: "See upcoming events", href: EVENTS_URL };

const received = (kind, role, extraVar) => ({
  title: `${kind} application received`,
  when: `Sent straight away when someone sends the Join form as a ${kind} (first time only).`,
  variables: ["first_name", "full_name", extraVar],
  defaults: {
    subject: "Thanks for joining House of Retrievers, {{first_name}}",
    greeting: "",
    heading: "Thanks, {{first_name}}. We have your application.",
    message: [`You asked to join House of Retrievers as a ${role}. It's with the team now.`, NEXT_STEP[kind]].join("\n\n"),
  },
  preheader: `We have your ${role} application.`,
  button: EVENTS_BUTTON,
  footnote: RECEIVED_FOOTNOTE,
});

const EVENT_VARIABLES = ["first_name", "full_name", "event_title", "event_date", "event_venue"];
const EVENT_DEFAULTS = {
  subject: "You're going: {{event_title}}",
  greeting: "",
  heading: "See you there, {{first_name}}.",
  message: "Show your pass at the door. It has a QR code the team scans to check you in.",
};

export const EDITABLE_TEMPLATES = {
  "member-registered": {
    title: "New member registration",
    when: "Sent straight away when someone sends the Join form as a Member (first time only).",
    variables: ["first_name", "full_name", "furbaby_name"],
    defaults: {
      subject: "Welcome to the House, {{first_name}}! 🤎",
      greeting: "Hi {{first_name}},",
      heading: "Welcome to the House! ⚡️",
      message: [
        "Thank you for registering with The House of Retrievers Society Inc. We’ve successfully received your membership registration.",
        "What started as a shared love for dogs has grown into a community built on friendship, kindness, and a genuine desire to give back.",
        "We’re happy you’ve chosen to be part of this journey.",
        "Here at the House, we believe that every paw has a purpose. Whether it’s making new friends, sharing meaningful experiences, or lending a helping paw, there’s so much we can do together.",
        "We look forward to creating more memories and making a difference with you.",
        "**Welcome home! 🤎**",
      ].join("\n\n"),
    },
    preheader: "We've received your membership registration.",
    footnote: "You're getting this because this email address was entered on the Join form. If that wasn't you, just reply and we'll remove it.",
  },
  "received-volunteer": received("Volunteer", "volunteer", "furbaby_name"),
  "received-partner": received("Partner", "partner", "organization"),
  "received-sponsor": received("Sponsor", "sponsor", "organization"),
  "member-welcome": {
    title: "Welcome to the pack (made Active)",
    when: "The standard email when an admin sets a Member to Active, or uses “Send the welcome email again”. You can pick one of your own Acceptance templates instead.",
    variables: ["first_name", "full_name", "furbaby_name", "member_no"],
    defaults: {
      subject: "Welcome to House of Retrievers, {{first_name}}",
      greeting: "",
      heading: "Welcome to the pack, {{first_name}}.",
      message: [
        "You're now a member of House of Retrievers. Your member number is **{{member_no}}**.",
        "Events are where it all happens: runs, care visits, workshops and fundraisers. RSVP on the events page with this email address and you'll get your pass straight away.",
        "There is always room for one more good human. Thanks for being one.",
      ].join("\n\n"),
    },
    preheader: "You're in.",
    button: EVENTS_BUTTON,
    footnote: "You're getting this because you joined House of Retrievers.",
  },
  "volunteer-welcome": {
    title: "Welcome, volunteer (made Active)",
    when: "The standard email when an admin sets a Volunteer to Active, or uses “Send the welcome email again”. You can pick one of your own Acceptance templates instead.",
    variables: ["first_name", "full_name", "furbaby_name", "member_no"],
    defaults: {
      subject: "Welcome to the team, {{first_name}}",
      greeting: "",
      heading: "Welcome to the team, {{first_name}}.",
      message: [
        "You're now a House of Retrievers volunteer. Your volunteer number is **{{member_no}}**.",
        "Someone from the team will get in touch before the events where an extra pair of hands helps. You'll find them all on the events page.",
        "Thank you for giving your time. It's what makes every event happen.",
      ].join("\n\n"),
    },
    preheader: "You're on the team.",
    button: EVENTS_BUTTON,
    footnote: "You're getting this because you signed up to volunteer with House of Retrievers.",
  },
  "rsvp-confirmed": {
    title: "RSVP confirmed (standard)",
    when: "Sent when someone RSVPs and gets a spot, for events that don't pick one of your Event templates. The event's details, any fee note and the “Open my pass” button are added automatically.",
    variables: EVENT_VARIABLES,
    defaults: EVENT_DEFAULTS,
    event: true,
  },
};

/** Kinds of template HOR can add on the Email templates page. */
export const CUSTOM_KINDS = {
  acceptance: {
    title: "Acceptance",
    when: "Send it from a person's profile when you accept them (volunteer, partner, sponsor or member), or pick it when setting a member to Active.",
    variables: ["first_name", "full_name", "furbaby_name", "organization", "role", "member_no"],
    defaults: {
      subject: "Welcome aboard, {{first_name}}!",
      greeting: "Hi {{first_name}},",
      heading: "You're in! 🤎",
      message: "Thank you for joining House of Retrievers as a {{role}}. We're glad to have you with us.\n\nSomeone from the team will be in touch with the next steps.",
    },
    preheader: "Welcome to House of Retrievers.",
    button: EVENTS_BUTTON,
    footnote: "You're getting this because you joined House of Retrievers.",
  },
  event: {
    title: "Event confirmation",
    when: "Pick it in an event's “Price and sign-ups” section. Everyone who RSVPs to that event gets it. The event's details, any fee note and the pass button are added automatically.",
    variables: EVENT_VARIABLES,
    defaults: EVENT_DEFAULTS,
    event: true,
  },
};

/** A built-in key, or "custom:acceptance" / "custom:event". */
export function templateDef(ref) {
  if (String(ref).startsWith("custom:")) return CUSTOM_KINDS[String(ref).slice(7)] || null;
  return EDITABLE_TEMPLATES[ref] || null;
}

export const TEMPLATE_LIMITS = { subject: 150, greeting: 120, heading: 150, message: 4000 };

const VAR_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Variable names used in `fields` that the template doesn't offer. */
export function unknownVariables(ref, fields) {
  const allowed = new Set(templateDef(ref)?.variables || []);
  const found = new Set();
  for (const value of Object.values(fields || {})) for (const [, name] of String(value || "").matchAll(VAR_RE)) if (!allowed.has(name)) found.add(name);
  return [...found];
}

/** Plain text with {{variables}} filled in. */
function fillPlain(text, vars) {
  return String(text || "").replace(VAR_RE, (_, name) => String(vars[name] ?? ""));
}

/**
 * The message as email paragraphs: a blank line starts a new paragraph, a
 * single line break stays a line break, **text** is bold. Variables are
 * filled after escaping, so a name can never inject markup.
 */
function messageParagraphs(text, vars) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) =>
      esc(para)
        .replace(/\*\*(.+?)\*\*/g, '<strong style="white-space:nowrap">$1</strong>')
        .replace(/\n/g, "<br>")
        .replace(VAR_RE, (_, name) => esc(vars[name] ?? "")),
    );
}

const ROLES = { Member: "member", Volunteer: "volunteer", Partner: "partner", Sponsor: "sponsor" };

/** Everything a template can mention about a person (and an event). */
function variablesFor(person = {}) {
  const event = person.event;
  return {
    first_name: firstName(person.name),
    full_name: String(person.name || "").trim() || "there",
    furbaby_name: String(person.furbaby || "").trim(),
    organization: String(person.organization || "").trim(),
    role: ROLES[person.kind] || "member",
    member_no: person.memberNo || "",
    event_title: event?.title || "",
    event_date: event ? formatWhen(event) : "",
    event_venue: event ? [event.venue, event.city].filter(Boolean).join(", ") : "",
  };
}

/** Sample person for previews and tests. */
export const SAMPLE_PERSON = {
  name: "Juan dela Cruz",
  furbaby: "Mochi",
  organization: "Pawsome Pet Shop",
  kind: "Volunteer",
  memberNo: "HOR-26-0001",
  event: { title: "Bedazzle Barkdate", date: "2026-10-17", startTime: "13:00", endTime: "16:00", venue: "Wiltlover Café", city: "Pasay" },
};

/**
 * Builds an editable email from saved (or default) wording. Event templates
 * get the event box before the message, then `extras` (fee note, pass button).
 */
export function renderTemplate(ref, custom, person, extras = {}) {
  const t = templateDef(ref);
  const fields = { ...t.defaults, ...Object.fromEntries(Object.entries(custom || {}).filter(([, v]) => typeof v === "string")) };
  const vars = variablesFor(person);
  const eventBox = t.event && person?.event ? [`<strong>${esc(vars.event_title)}</strong><br>${esc(vars.event_date)}<br>${esc(vars.event_venue)}`] : [];
  return build({
    subject: fillPlain(fields.subject, vars).replace(/\s+/g, " ").trim() || fillPlain(t.defaults.subject, vars),
    preheader: t.event ? `${vars.event_date} · ${vars.event_venue}` : t.preheader,
    greeting: fillPlain(fields.greeting, vars).trim() || undefined,
    heading: fillPlain(fields.heading, vars).trim() || fillPlain(t.defaults.heading, vars),
    paragraphs: [...eventBox, ...messageParagraphs(fields.message, vars), ...(extras.paragraphs || [])],
    button: extras.button || t.button,
    after: extras.after,
    footnote: extras.footnote || t.footnote,
  });
}

/** Sent straight away when someone sends the Join form. */
export function applicationReceived({ name, kind, again = false, furbaby = "", organization = "", custom = null }) {
  const role = ROLES[kind] || "member";
  if (!again) {
    const key = kind === "Member" ? "member-registered" : `received-${role}`;
    if (EDITABLE_TEMPLATES[key]) return renderTemplate(key, custom, { name, kind, furbaby, organization });
  }
  return build({
    subject: "We got your update",
    preheader: "We've added it to what you sent before.",
    heading: `Got it, ${firstName(name)}.`,
    paragraphs: [`You sent the Join form again, so we've added your new details to your ${role} application.`, NEXT_STEP[kind] || NEXT_STEP.Member],
    button: EVENTS_BUTTON,
    footnote: RECEIVED_FOOTNOTE,
  });
}

/** Template key for the Join email a kind gets (first time). */
export const receivedKey = (kind) => (kind === "Member" ? "member-registered" : `received-${ROLES[kind] || "member"}`);

/** The standard welcome for a kind made Active. */
export const welcomeKey = (kind) => (kind === "Volunteer" ? "volunteer-welcome" : "member-welcome");

/**
 * Sent when an admin makes a member or volunteer Active: the standard welcome
 * for their kind, or an Acceptance template (`ref` "custom:acceptance").
 */
export function welcomeMember({ name, memberNo, furbaby = "", organization = "", kind = "Member", custom = null, ref = welcomeKey(kind) }) {
  return renderTemplate(ref, custom, { name, memberNo, furbaby, organization, kind });
}

/** An Acceptance template sent to anyone in People. */
export function acceptanceEmail({ person, custom }) {
  return renderTemplate("custom:acceptance", custom, person);
}

/**
 * Sent when someone RSVPs (or joins the waitlist) on the events page. A
 * confirmed spot uses the event's chosen template, HOR's saved standard
 * wording, or the default; the waitlist note is fixed.
 */
export function rsvpConfirmed({ name, event, status, passUrl, feeRequired, custom = null, ref = "rsvp-confirmed" }) {
  const waitlist = status === "waitlist";
  const footnote = `You're getting this because this email address was used to RSVP at ${EVENTS_URL.replace("https://", "")}.`;
  const after = ["Can't make it after all? Reply to this email so someone else can have the spot."];
  if (!waitlist) {
    return renderTemplate(ref, custom, { name, event }, {
      paragraphs: feeRequired ? ["This event has a fee, paid by QR before the day. The team will confirm once it's in."] : [],
      button: { label: "Open my pass", href: passUrl },
      after,
      footnote,
    });
  }
  const when = formatWhen(event);
  const where = [event.venue, event.city].filter(Boolean).join(", ");
  return build({
    subject: `You're on the waitlist: ${event.title}`,
    preheader: `${when} · ${where}`,
    heading: `You're on the waitlist, ${firstName(name)}.`,
    paragraphs: [
      `<strong>${esc(event.title)}</strong><br>${esc(when)}<br>${esc(where)}`,
      "The event is full right now. If a spot opens, we'll email you, and your pass below will show it.",
    ],
    button: { label: "Open my waitlist pass", href: passUrl },
    after,
    footnote,
  });
}
