"use server";

import { sql } from "../lib/db";
import { actionAdmin, adminBase, backWith, Forbidden } from "../lib/admin/guard";
import { safeReturn } from "../lib/letterReturn.mjs";
import { logActivity } from "../lib/admin/log";
import { emailReady, sendEmail } from "../lib/email";
import { logSend } from "../lib/letterSendsStore";
import { EVENT_BLANKS, eventLetterKey } from "../lib/letterEvent.mjs";
import { eventFills } from "../lib/letterEventStore";
import { INVITATION_CARD_CID, invitationEmail, letterCoverEmail } from "../lib/emailTemplates.mjs";
import { escapeFills, fillDesign, renderDesign, sendBlanks } from "../lib/emailDesign.mjs";
import { loadDesign, loadHouse } from "../lib/emailDesignStore";
import { LETTER_LIMITS, LETTER_STARTERS, MAX_LETTER_RECIPIENTS, blanksOf, cleanEdits, fillLetter, unionBlanks, wordingFor, letterDate, missingBlanks, prepareLetter, recipientFields } from "../lib/letters.mjs";
import { letterPdf } from "../lib/letterPdf.mjs";
import { listLetters, loadLetter, savedAnswers, signatureForPdf } from "../lib/letterStore";

// The letter blanks Payment settings fills (see paymentLetterFills).
const fromPaymentsLabels = ["HOR Bank", "HOR Account Name", "HOR Account Number", "HOR GCash Number / Name"];
import { pictureFrom } from "../lib/admin/imageUpload";
import { cleanSignature } from "../lib/letterSignature.mjs";
import { LETTER_GROUPS, letterEmails } from "../lib/contacts.mjs";
import { copiesFor, parseCopies } from "../lib/letterCopies.mjs";
import { readSendTo, withSendTo } from "../lib/letterSendTo.mjs";
import { MAX_INVITATION_PAGES, cardNames, cleanInvitation, isInvitation, readCardNames, withCardName } from "../lib/invitationCard.mjs";
import { extraPages, invitationPdf, renderCard, withPassQr } from "../lib/invitationRender";
import { passCodes, registrationRecipients } from "../lib/letterRegistrations";

const parseJson = (text) => { try { return JSON.parse(text); } catch { return null; } };
const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const isKey = (key) => LETTER_STARTERS.some((l) => l.key === key);
const looksLikeKey = (key) => /^[a-z0-9-]{1,60}$/.test(String(key || ""));
const looksLikeEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** Settings → Letters: save HOR's wording for one letter (replaces the starter, or updates HOR's own letter). */
export async function saveLetter(data) {
  const key = form(data, "key");
  const back = looksLikeKey(key) ? `/letters/${key}` : "/letters";
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    const before = await loadLetter(key);
    if (!looksLikeKey(key) || !before) await backWith("/letters", "error", "That letter doesn't exist.");
    // Email only (no PDF): the letter text and signature aren't shown, so the saved ones are kept as they are.
    const attachPdf = form(data, "attachPdf") !== "no";
    const f = { name: form(data, "name").trim(), subject: form(data, "subject").replace(/\s+/g, " ").trim(), cover: form(data, "cover").replace(/\r\n?/g, "\n").trim(), body: attachPdf && data.has("body") ? form(data, "body").replace(/\r\n?/g, "\n").trim() : before.body };
    for (const [field, max] of Object.entries({ name: LETTER_LIMITS.name, subject: LETTER_LIMITS.subject, cover: LETTER_LIMITS.cover, body: LETTER_LIMITS.body })) {
      if (!f[field]) await backWith(back, "error", `The ${field === "body" ? "letter" : field === "cover" ? "email text" : field} can't be empty.`);
      if (f[field].length > max) await backWith(back, "error", `The ${field === "body" ? "letter" : field} is too long (${max.toLocaleString("en-PH")} characters at most).`);
    }
    // Signature: switched on or off, where it sits, and its image (PNG or JPEG for the PDF).
    let signature = before.signature;
    if (attachPdf && data.has("signatureOn")) {
      const image = await pictureFrom(data, "signature", admin.email, { types: /^image\/(?:png|jpeg)$/, private: true });
      if (image.error) await backWith(back, "error", image.error);
      signature = cleanSignature({ on: form(data, "signatureOn"), image: image.url, x: form(data, "signatureX"), dy: form(data, "signatureDy"), width: form(data, "signatureWidth") });
      if (signature.on && !signature.image) await backWith(back, "error", "Add a signature image, or switch the signature off.");
    }
    // Invitation card (owner, 2026-11-11): the card art, its extra pages and where the name goes.
    // A form without the card section (an older open tab) keeps the saved settings.
    let invitation = before.invitation;
    if (data.has("invitationOn")) {
      const card = await pictureFrom(data, "inviteCard", admin.email, { private: true });
      if (card.error) await backWith(back, "error", card.error);
      const pages = [];
      for (let i = 0; i < MAX_INVITATION_PAGES; i += 1) {
        const page = await pictureFrom(data, `invitePage${i}`, admin.email, { private: true });
        if (page.error) await backWith(back, "error", page.error);
        if (page.url) pages.push(page.url);
      }
      invitation = cleanInvitation({ on: form(data, "invitationOn") === "1", card: card.url, pages, y: form(data, "invitationY"), nameSize: form(data, "invitationNameSize"), orgSize: form(data, "invitationOrgSize"), audience: form(data, "invitationAudience"), qr: data.has("invitationQr") ? parseJson(form(data, "invitationQr")) : before.invitation?.qr });
      if (invitation.on && !invitation.card) await backWith(back, "error", "Upload the blank invitation card, or switch the invitation card off.");
    }
    await sql(
      `INSERT INTO letter_templates (key, name, subject, cover, body, signature, attach_pdf, invitation, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, $7, $8, $9, $6, now())
       ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, subject = EXCLUDED.subject, cover = EXCLUDED.cover, body = EXCLUDED.body, signature = EXCLUDED.signature, attach_pdf = EXCLUDED.attach_pdf, invitation = EXCLUDED.invitation, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [key, f.name, f.subject, f.cover, f.body, admin.email, signature ? JSON.stringify(signature) : null, attachPdf || isInvitation(invitation), invitation ? JSON.stringify(invitation) : null],
    );
    await logActivity(admin.email, "letter.save", f.name, { letter: key, ...(attachPdf ? {} : { pdf: "none" }) });
    await backWith(back, "ok", "Saved. Letters sent from now on use this wording.");
  });
}

/** Back to the wording converted from HOR's Word file. */
export async function resetLetter(data) {
  const key = form(data, "key");
  const back = isKey(key) ? `/letters/${key}` : "/letters";
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    // Only built-in letters have an original to go back to; HOR's own letters are removed instead.
    if (!isKey(key)) await backWith("/letters", "error", "This letter has no original wording to go back to.");
    await sql("DELETE FROM letter_templates WHERE key = $1", [key]);
    await logActivity(admin.email, "letter.reset", key, { letter: key });
    await backWith(back, "ok", "Back to the original wording.");
  });
}

/** "supporter:<uuid>" / "person:<uuid>" → rows with who to send to. */
async function loadRecipients(refs, { eventId = null, admin = null } = {}) {
  const ids = (kind) => refs.filter((r) => r.startsWith(`${kind}:`)).map((r) => r.slice(kind.length + 1)).filter(isUuid);
  const [supporters, people, contacts, beneficiaries] = await Promise.all([
    ids("supporter").length ? sql("SELECT id, name, kind, contact_email, contact_name, address, salutation, greeting FROM supporters WHERE id = ANY($1::uuid[])", [ids("supporter")]) : [],
    ids("person").length ? sql("SELECT id, name, email, organization FROM people WHERE id = ANY($1::uuid[])", [ids("person")]) : [],
    ids("contact").length ? sql("SELECT id, name, organization, email, rep_email, send_to, address, salutation FROM letter_contacts WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL", [ids("contact")]) : [],
    ids("beneficiary").length ? sql("SELECT id, name, contact_name, contact_email, address, salutation FROM beneficiaries WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL", [ids("beneficiary")]) : [],
  ]);
  const registrations = await registrationRecipients(ids("registration"), { eventId, admin });
  return [
    ...registrations,
    ...supporters.map((s) => ({ ref: `supporter:${s.id}`, id: s.id, type: "supporter", ...recipientFields({ supporter: s }), email: (s.contact_email || "").trim() })),
    ...people.map((p) => ({ ref: `person:${p.id}`, id: p.id, type: "person", ...recipientFields({ person: p }), email: (p.email || "").trim() })),
    ...contacts.map((c) => ({ ref: `contact:${c.id}`, id: c.id, type: "contact", ...recipientFields({ contact: c }), email: letterEmails(c).to, cc: letterEmails(c).cc })),
    ...beneficiaries.map((b) => ({ ref: `beneficiary:${b.id}`, id: b.id, type: "beneficiary", ...recipientFields({ beneficiary: b }), email: (b.contact_email || "").trim() })),
  ];
}

/**
 * Sends a letter: for each recipient with an email, the letter filled in with
 * their name becomes a PDF attached to a short covering email. Blanks are the
 * same for everyone in the send and are remembered for next time.
 */
export async function sendLetters(data) {
  const back = form(data, "back").startsWith("/letters/send") ? form(data, "back") : "/letters/send";
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    if (!emailReady()) await backWith(back, "error", "Email isn't set up yet (Resend key missing).");
    const letter = await loadLetter(form(data, "letter"));
    if (!letter) await backWith(back, "error", "Pick a letter.");
    // A letter set to email only never attaches a PDF; a PDF letter can skip it for one send.
    // An invitation card always goes with its card picture and PDF (owner, 2026-11-11).
    const invite = isInvitation(letter.invitation);
    const attach = invite || (letter.attachPdf && form(data, "attach") !== "no");
    // A brand email design (Email templates → Brand email designs), when one was picked.
    const design = !invite && isUuid(form(data, "design")) ? await loadDesign(form(data, "design")) : null;
    if (form(data, "design") && (!design || design.kind === "house")) await backWith(back, "error", "That email design wasn't found. Pick another.");
    // Wording edited for this send (one brand, or all): every version's fill-ins are asked.
    const sendRefs = [...new Set(data.getAll("to").filter((v) => typeof v === "string"))];
    const { edits, error: editError } = cleanEdits(form(data, "edits"), sendRefs);
    if (editError) await backWith(back, "error", editError);
    const versions = [letter, ...(edits.all ? [wordingFor(letter, { all: edits.all }, "")] : []), ...Object.keys(edits.byRef).map((ref) => wordingFor(letter, edits, ref))];
    const blanks = unionBlanks(versions.map((v) => sendBlanks(v, design, attach)));
    let typed = {};
    try { typed = JSON.parse(form(data, "values") || "{}"); } catch { typed = {}; }
    const values = Object.fromEntries(blanks.map((b) => [b.label, String(typed[b.label] ?? "").trim().slice(0, LETTER_LIMITS.value)]));
    // HOR's bank and GCash always come from Payment settings, whatever was typed.
    const { values: paid, fromPayments } = await savedAnswers([...fromPaymentsLabels]);
    for (const label of fromPayments) if (label in values) values[label] = paid[label];
    // For an event (from its Brand tracker, or the event's own letter): event fill-ins left empty come from the event.
    const eventId = isUuid(form(data, "event")) ? form(data, "event") : letter.eventId || null;
    const [event] = eventId ? await sql("SELECT id FROM events WHERE id = $1", [eventId]) : [];
    if (event) {
      const fills = await eventFills(event.id);
      for (const label of EVENT_BLANKS) if (label in values && !values[label] && fills[label]) values[label] = fills[label];
    }
    const missing = missingBlanks(blanks, values);
    if (missing.length) await backWith(back, "error", `Fill in: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? ` and ${missing.length - 4} more` : ""}.`);

    const refs = [...new Set(data.getAll("to").filter((v) => typeof v === "string"))];
    if (!refs.length) await backWith(back, "error", "Tick at least one recipient.");
    if (refs.length > MAX_LETTER_RECIPIENTS) await backWith(back, "error", `Send to ${MAX_LETTER_RECIPIENTS} at most at a time.`);
    // Another email (and name) for some recipients, for this send only; their records stay as they are.
    const sendTo = readSendTo(form(data, "sendTo"), refs);
    if (sendTo.error) await backWith(back, "error", sendTo.error);
    const recipients = (await loadRecipients(refs, { eventId: event?.id || null, admin })).map((r) => withSendTo(r, sendTo.byRef[r.ref]));
    // Extra CC / BCC typed for this send: copied on every recipient's email.
    const extraCc = parseCopies(form(data, "copyCc"), "CC");
    const extraBcc = parseCopies(form(data, "copyBcc"), "BCC");
    if (extraCc.error || extraBcc.error) await backWith(back, "error", extraCc.error || extraBcc.error);

    const house = design ? await loadHouse() : null;
    const date = letterDate();
    const batch = Date.now();
    const signature = attach && !invite ? await signatureForPdf(letter.signature) : null;
    // Invitation cards: each guest's name and organization (typed on the send page, else from the record),
    // and the extra pages, made once for the whole send.
    const typedNames = readCardNames(form(data, "cardNames"), refs).byRef;
    let invitePages = [];
    if (invite) {
      try { invitePages = await extraPages(letter.invitation); } catch (error) { await backWith(back, "error", `The invitation's pages couldn't be read (${error?.message || error}).`); }
    }
    // Participants' check-in QR on the last page (when the letter has it on).
    const codes = invite && cleanInvitation(letter.invitation).qr.on
      ? await passCodes(recipients.filter((r) => r.type === "registration").map((r) => r.id), { eventId: event?.id || null, admin })
      : new Map();
    const sent = [];
    const skipped = [];
    const failed = [];
    for (const r of recipients) {
      if (!looksLikeEmail(r.email)) { skipped.push(r.name); continue; }
      const own = wordingFor(letter, edits, r.ref);
      const prepared = prepareLetter(own, { ...(invite ? withCardName(r, typedNames[r.ref]) : r), date, values, signed: Boolean(signature) });
      // A design: its email, filled in for this recipient (PDF attached when on). Else, with the
      // PDF: a short cover email with the letter attached; without: the letter is the email.
      let mail;
      if (invite) {
        const names = cardNames(r, typedNames[r.ref]);
        try {
          const card = await renderCard(letter.invitation, names);
          // The pass QR only goes to the participant's own address on record: never with CC/BCC
          // copies or a "Send to another email" address, since whoever holds it can check in.
          const ownInbox = r.onRecord === undefined && !extraCc.emails.length && !extraBcc.emails.length && !(r.cc || []).length;
          const pages = r.type === "registration" && ownInbox ? await withPassQr(invitePages, letter.invitation, codes.get(r.id)?.code, { comp: codes.get(r.id)?.comp }) : invitePages;
          const pdf = await invitationPdf([card, ...pages], { title: prepared.subject });
          mail = { ...invitationEmail({ subject: prepared.subject, cover: prepared.cover, filename: prepared.filename, name: names.name }), attachments: [{ filename: "invitation-card.jpg", content: card, contentId: INVITATION_CARD_CID }, { filename: prepared.filename, content: pdf }] };
        } catch (error) {
          console.error("invitation card not made", error?.message || error);
          failed.push(r.name);
          continue;
        }
      } else if (design) {
        const to = { name: r.name, contact: r.contact, address: r.address, salutation: r.salutation, date, values };
        const escaped = escapeFills(to);
        const filled = fillDesign(design.doc, design.subject || prepared.subject, (text, { html }) => fillLetter(text, html ? escaped : to, { plain: !html }));
        mail = renderDesign(filled.doc, { house, subject: filled.subject });
        if (attach) mail.attachments = [{ filename: prepared.filename, content: await letterPdf(prepared.blocks, { title: prepared.subject, signature }) }];
      } else if (attach) {
        mail = { ...letterCoverEmail({ subject: prepared.subject, cover: prepared.cover, filename: prepared.filename }), attachments: [{ filename: prepared.filename, content: await letterPdf(prepared.blocks, { title: prepared.subject, signature }) }] };
      } else {
        // Email only (the letter has no PDF, or it was switched off for this send): the cover email is the message.
        mail = letterCoverEmail({ subject: prepared.subject, cover: prepared.cover, filename: prepared.filename, attached: false });
      }
      const copies = copiesFor({ to: r.email, cc: r.cc || [] }, extraCc.emails, extraBcc.emails);
      const result = await sendEmail({ to: r.email, ...copies, ...mail, idempotencyKey: `letter/${letter.key}/${r.ref}/${batch}` });
      await logSend({ ref: r.ref, letterKey: letter.key, to: r.email, ...copies, result, by: admin.email, eventId: event?.id || null, designId: design?.id || null });
      if (!result.ok) { failed.push(r.name); continue; }
      sent.push(r.name);
      await logActivity(admin.email, `${r.type}.letter`, r.name, { [`${r.type}Id`]: r.id, letter: letter.key, letterName: letter.name, to: r.email, ...(attach ? {} : { pdf: "none" }), ...(design ? { design: design.name } : {}), ...(own.edited ? { edited: true } : {}), ...(copies.cc.length ? { cc: copies.cc } : {}), ...(copies.bcc.length ? { bcc: copies.bcc } : {}), ...(r.onRecord !== undefined ? { insteadOf: r.onRecord || "no email on record", ...(sendTo.byRef[r.ref]?.contact ? { addressedTo: sendTo.byRef[r.ref].contact } : {}) } : {}) });
      if (r.type === "contact") await sql("UPDATE letter_contacts SET last_letter = $2, last_sent_at = now() WHERE id = $1", [r.id, letter.key]);
      if (r.type === "beneficiary") await sql("UPDATE beneficiaries SET last_letter = $2, last_sent_at = now() WHERE id = $1", [r.id, letter.key]);
      await pause(350); // Resend allows a few requests a second
    }

    // Remember what was typed for next time (contact person, signatory, bank details…).
    for (const [label, value] of Object.entries(values)) {
      if (!value) continue;
      if (event && EVENT_BLANKS.includes(label)) continue; // this event's own name, not the default
      if (fromPayments.has(label)) continue; // kept in Payment settings
      await sql(
        `INSERT INTO letter_saved_values (label, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (label) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()
         WHERE NOT letter_saved_values.standard`,
        [label.slice(0, 400), value, admin.email],
      );
    }

    const parts = [sent.length ? `Sent “${letter.name}” to ${sent.length}` : "Nothing sent"];
    if (skipped.length) parts.push(`no email for ${skipped.join(", ")}`);
    if (failed.length) parts.push(`didn't go through for ${failed.join(", ")} (try again)`);
    const list = new URLSearchParams(back.split("?")[1] || "").get("list");
    // Sent from the send window: back to the page it was opened over.
    const returnTo = safeReturn(form(data, "returnTo"));
    if (returnTo) await backWith(returnTo, failed.length && !sent.length ? "error" : "ok", `${parts.join("; ")}.`);
    await backWith(event ? (list === "registrations" ? `/registrations/${event.id}` : `/events/${event.id}/${["guests", "donors"].includes(list) ? list : "brands"}`) : back, failed.length && !sent.length ? "error" : "ok", `${parts.join("; ")}.`);
  });
}

/** A new invitation card for an event: the personal note; the card art is uploaded in the editor. */
const INVITATION_BLANK = {
  subject: "You're invited: [Event Name]",
  cover: "Dear [Salutation],\n\nIt would be our honour to have you with us at [Event Name] on [Event Date], [Event Time], at [Event Location].\n\nYour personal invitation is below. The full invitation, with our attire guide and the organisations we are supporting, is attached.\n\nKindly let us know whether you can join us by replying to this email.",
  body: "Invitation card",
  invitation: { on: true, card: "", pages: [], y: 0.84, nameSize: 72, orgSize: 28, audience: "guests" },
};

/** The same card for registered participants: their place is confirmed, so it never asks them to RSVP. */
const INVITATION_PARTICIPANTS = {
  subject: "Your invitation to [Event Name]",
  cover: "Dear [Salutation],\n\nThank you for registering for [Event Name]. Your place is confirmed, and we are delighted to welcome you on [Event Date], [Event Time], at [Event Location].\n\nYour personal invitation is below. The full invitation, with our attire guide and the organisations your registration supports, is attached.\n\nAt the door, we'll scan the QR pass from your confirmation email, so please keep it handy.\n\nWe look forward to celebrating with you.",
  body: "Invitation card",
  invitation: { ...INVITATION_BLANK.invitation, audience: "participants" },
};

const slug = (text) => String(text || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "letter";

/** A new letter's content from a Word file (read in the browser by WordImport): its text as the body, its "Subject:" line or name as the subject. */
function fromWord(data, blank, name) {
  const body = form(data, "body").replace(/\r\n?/g, "\n").trim().slice(0, LETTER_LIMITS.body);
  if (!body) return null;
  const subject = (form(data, "subject").trim() || name).slice(0, LETTER_LIMITS.subject);
  return { ...blank, subject, body };
}

/** Letters: a new letter of HOR's own: blank, from a Word file, or copied from another letter ("from"). */
export async function createLetter(data) {
  return guarded("/letters", async () => {
    const admin = await actionAdmin("letters:edit");
    const from = form(data, "from");
    const source = from ? await loadLetter(from) : null;
    if (from && !source) await backWith("/letters", "error", "The letter to copy wasn't found.");
    const name = (form(data, "name").trim() || (source ? `Copy of ${source.name}` : "")).slice(0, LETTER_LIMITS.name);
    if (!name) await backWith("/letters", "error", "Give the new letter a name.");
    const key = `my-${slug(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const blank = {
      subject: "Subject line",
      cover: "Dear [Salutation],\n\nWarm greetings from The House of Retrievers’ Society, Inc.\n\nOur letter is attached.",
      body: "[Date]\n\n[Their Contact Person?]\n[Company Name]\n[Address?]\n\n**Subject: Subject line**\n\nDear [Salutation]:\n\nWrite the letter here.\n\nSincerely yours,\n\n**[Signatory Name]**\n\n[Signatory Position]\n\n**THE HOUSE OF RETRIEVERS’ SOCIETY, INC.**",
    };
    const l = source || fromWord(data, blank, name) || blank;
    await sql(
      `INSERT INTO letter_templates (key, name, subject, cover, body, signature, invitation, updated_by, updated_at, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $7, $8, $6, now(), $6, now())`,
      [key, name, l.subject, l.cover, l.body, admin.email, l.signature ? JSON.stringify(l.signature) : null, l.invitation ? JSON.stringify(l.invitation) : null],
    );
    await logActivity(admin.email, "letter.create", name, { letter: key, from: from || null, ...(l !== blank && !source ? { word: true } : {}) });
    await backWith(`/letters/${key}`, "ok", source ? `Copied “${source.name}”. Edit the copy, then save.` : l !== blank ? "Letter made from your Word file. Check it, add any [fill-ins], then save." : "New letter made. Write it, then save.");
  });
}

/** An event's Letters page: a new letter for that event, copied from an existing letter or blank. */
export async function createEventLetter(data) {
  const eventId = form(data, "event");
  const back = isUuid(eventId) ? `/events/${eventId}/letters` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    const [event] = isUuid(eventId) ? await sql("SELECT id, title FROM events WHERE id = $1", [eventId]) : [];
    if (!event) await backWith("/events", "error", "That event wasn't found.");
    // A Word file, when one was picked, wins over "Start from".
    const word = form(data, "body").trim() ? true : false;
    // "An invitation card" (owner, 2026-11-11): a blank invitation, card art uploaded in the editor.
    const inviteKind = word ? "" : { "invitation-card": "guests", "invitation-participants": "participants" }[form(data, "from")] || "";
    const invite = Boolean(inviteKind);
    const from = word || invite ? "" : form(data, "from");
    const source = from ? await loadLetter(from) : null;
    if (from && !source) await backWith(back, "error", "The letter to start from wasn't found.");
    const name = (form(data, "name").trim() || (source ? `${source.name} — ${event.title}` : `${inviteKind === "participants" ? "Invitation card for participants" : invite ? "Invitation card" : "Letter"} — ${event.title}`)).slice(0, LETTER_LIMITS.name);
    const key = eventLetterKey(name);
    const blank = {
      subject: "[Event Name]",
      cover: "Dear [Salutation],\n\nWarm greetings from The House of Retrievers’ Society, Inc.\n\nOur letter about [Event Name] on [Event Date] is attached.",
      body: "[Date]\n\n[Their Contact Person?]\n[Company Name]\n[Address?]\n\n**Subject: [Event Name]**\n\nDear [Salutation]:\n\nWrite the letter here. [Event Name] is on [Event Date], [Event Time], at [Event Location].\n\nSincerely yours,\n\n**[Signatory Name]**\n\n[Signatory Position]\n\n**THE HOUSE OF RETRIEVERS’ SOCIETY, INC.**",
    };
    const l = source || (invite ? (inviteKind === "participants" ? INVITATION_PARTICIPANTS : INVITATION_BLANK) : null) || fromWord(data, blank, name) || blank;
    await sql(
      `INSERT INTO letter_templates (key, name, subject, cover, body, signature, invitation, updated_by, updated_at, created_by, created_at, event_id, based_on)
       VALUES ($1, $2, $3, $4, $5, $7, $10, $6, now(), $6, now(), $8, $9)`,
      [key, name, l.subject, l.cover, l.body, admin.email, l.signature ? JSON.stringify(l.signature) : null, event.id, source?.key || null, l.invitation ? JSON.stringify(l.invitation) : null],
    );
    await logActivity(admin.email, "letter.create", name, { letter: key, from: from || null, eventId: event.id });
    if (invite) await backWith(`/letters/${key}`, "ok", "Invitation card made. Upload the blank card and its other pages, place the name, then save.");
    await backWith(`/letters/${key}`, "ok", source ? `Made “${name}” from “${source.name}” for this event. Edit it, then save.` : l !== blank ? "Event letter made from your Word file. Check it, add any [fill-ins], then save." : "New event letter made. Write it, then save.");
  });
}

/** Letters: remove one of HOR's own letters (built-in letters can only go back to their original wording). */
export async function deleteLetter(data) {
  const key = form(data, "key");
  return guarded("/letters", async () => {
    const admin = await actionAdmin("letters:edit");
    if (!looksLikeKey(key) || isKey(key)) await backWith("/letters", "error", "Built-in letters can't be removed.");
    const [row] = await sql("UPDATE letter_templates SET deleted_at = now() WHERE key = $1 AND deleted_at IS NULL RETURNING name, event_id", [key]);
    if (row) await logActivity(admin.email, "letter.remove", row.name, { letter: key });
    await backWith(row?.event_id ? `/events/${row.event_id}/letters` : "/letters", "ok", row ? `Removed “${row.name}”.` : "Already removed.");
  });
}

/** Letters → Standard details: HOR's usual answers; ticked ones fill in by themselves and aren't asked when sending. */
export async function saveStandardDetails(data) {
  return guarded("/letters/details", async () => {
    const admin = await actionAdmin("letters:edit");
    const labels = data.getAll("label").filter((v) => typeof v === "string").slice(0, 300);
    const standard = new Set(data.getAll("standard").filter((v) => typeof v === "string"));
    for (const [i, label] of labels.entries()) {
      const value = String(data.getAll("value")[i] ?? "").trim().slice(0, LETTER_LIMITS.value);
      if (!label || label.length > 400) continue;
      if (!value) {
        await sql("DELETE FROM letter_saved_values WHERE label = $1", [label]);
        continue;
      }
      await sql(
        `INSERT INTO letter_saved_values (label, value, standard, updated_by, updated_at) VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (label) DO UPDATE SET value = EXCLUDED.value, standard = EXCLUDED.standard, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [label, value, standard.has(label), admin.email],
      );
    }
    await logActivity(admin.email, "letter.details", "Standard details", { count: labels.length });
    await backWith("/letters/details", "ok", "Saved. Letters use these from now on.");
  });
}

/** Letters → Which letter each group gets. */
export async function saveGroupLetters(data) {
  return guarded("/letters", async () => {
    const admin = await actionAdmin("letters:edit");
    const keys = new Set((await listLetters()).map((l) => l.key));
    for (const group of LETTER_GROUPS) {
      const letter = form(data, `group-${group.key}`);
      if (!keys.has(letter)) continue;
      await sql(
        `INSERT INTO letter_group_letters (group_key, letter_key, updated_by, updated_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (group_key) DO UPDATE SET letter_key = EXCLUDED.letter_key, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [group.key, letter, admin.email],
      );
    }
    await logActivity(admin.email, "letter.groups", "Which letter each group gets", {});
    await backWith("/letters", "ok", "Saved which letter each group gets.");
  });
}


/**
 * The send window (owner, 2026-11-12): everything the send page shows, for a
 * query like the page's ("letter=…&to=…"), so any send button can open it over
 * the page it's on. Same permission as the page.
 */
export async function openLetterSend(query) {
  try {
    const admin = await actionAdmin("letters:edit");
    const { loadSendData, paramsFromQuery } = await import("./(app)/letters/send/sendData");
    return { ok: true, ...(await loadSendData(paramsFromQuery(query), { admin, base: await adminBase() })) };
  } catch (error) {
    if (error instanceof Forbidden) return { ok: false, error: error.message };
    throw error;
  }
}
