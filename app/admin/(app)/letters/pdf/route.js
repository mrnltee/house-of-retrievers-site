import { passCodes, registrationRecipients } from "../../../../lib/letterRegistrations";
import { sql } from "../../../../lib/db";
import { currentAdmin } from "../../../../lib/admin/auth";
import { can } from "../../../../lib/admin/roles.mjs";
import { LETTER_LIMITS, blanksOf, letterValues, prepareLetter, recipientFields } from "../../../../lib/letters.mjs";
import { readSendTo } from "../../../../lib/letterSendTo.mjs";
import { letterPdf } from "../../../../lib/letterPdf.mjs";
import { loadLetter, savedAnswers, signatureForPdf } from "../../../../lib/letterStore";
import { eventFills } from "../../../../lib/letterEventStore";
import { MAX_INVITATION_PAGES, cardNames, cleanInvitation, isInvitation, readCardNames, withCardName } from "../../../../lib/invitationCard.mjs";
import { extraPages, invitationPdf, renderCard, withPassQr } from "../../../../lib/invitationRender";

export const dynamic = "force-dynamic";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

/**
 * A letter as a PDF, to check before sending or to download: posted from the
 * letter editor (sample recipient) or the send page (a chosen recipient and
 * the blanks typed so far). Nothing is saved or sent.
 */
export async function POST(request) {
  const admin = await currentAdmin();
  if (!admin || !can(admin, "letters:view")) return new Response("Not allowed", { status: 403 });
  const data = await request.formData();
  const field = (key) => (typeof data.get(key) === "string" ? data.get(key) : "");
  const saved = await loadLetter(field("letter"));
  if (!saved) return new Response("Not found", { status: 404 });
  // The editor posts its unsaved wording to preview it; that needs the right to edit letters.
  if (field("body") && !can(admin, "letters:edit")) return new Response("Not allowed", { status: 403 });
  const letter = field("body") ? { ...saved, subject: field("subject") || saved.subject, cover: field("cover") || saved.cover, body: field("body").slice(0, LETTER_LIMITS.body) } : saved;
  let typed = {};
  try { typed = JSON.parse(field("values") || "{}"); } catch { typed = {}; }
  const blanks = blanksOf(letter.subject, letter.cover, letter.body);
  // The same values the page view and the sent letter use: Payment settings' bank (always), what was
  // typed, standard details and the event's fill-ins (the letter's own event, or the send's), then the sample.
  const answers = await savedAnswers();
  const eventId = isUuid(field("event")) ? field("event") : saved.eventId || null;
  const known = { ...Object.fromEntries([...answers.standard].map((label) => [label, answers.values[label]])), ...(eventId ? await eventFills(eventId) : {}) };
  const forced = Object.fromEntries([...answers.fromPayments].map((label) => [label, answers.values[label]]));
  const values = letterValues(blanks, { forced, typed, known, sample: Boolean(field("sample")) });

  let to = { name: "Pawsome Pet Shop", contact: "Jessie Mae Gabriel", address: "123 Katipunan Ave.\nQuezon City 1108", salutation: "Ms. Jessie" };
  // The send page posts its whole form: "previewTo" is the recipient shown in the preview.
  const [type, id] = (field("previewTo") || field("to")).split(":");
  if (type === "supporter" && isUuid(id)) {
    const [row] = await sql("SELECT name, contact_name, address, salutation, greeting FROM supporters WHERE id = $1", [id]);
    if (row) to = recipientFields({ supporter: row });
  } else if (type === "person" && isUuid(id)) {
    const [row] = await sql("SELECT name, organization FROM people WHERE id = $1", [id]);
    if (row) to = recipientFields({ person: row });
  } else if (type === "beneficiary" && isUuid(id)) {
    const [row] = await sql("SELECT name, contact_name, address, salutation FROM beneficiaries WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (row) to = recipientFields({ beneficiary: row });
  } else if (type === "registration" && isUuid(id)) {
    // A registered participant (permission and event checked there).
    const [row] = await registrationRecipients([id], { eventId, admin });
    if (row) to = row;
  } else if (type === "contact" && isUuid(id)) {
    const [row] = await sql("SELECT name, organization, address, salutation FROM letter_contacts WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (row) to = recipientFields({ contact: row });
  }
  // Addressed to someone else for this send (the send page's "Send to someone else").
  const other = readSendTo(field("sendTo"), [field("previewTo") || field("to")]).byRef[field("previewTo") || field("to")];
  if (other?.contact) to = { ...to, contact: other.contact, salutation: other.contact };
  // An invitation card: the guest's card (format=card: just the picture) or the card plus its pages.
  // The editor posts its unsaved settings and any newly picked pictures (data URLs).
  let invitation = saved.invitation;
  if (field("invitation") && can(admin, "letters:edit")) { try { invitation = JSON.parse(field("invitation")); } catch { invitation = saved.invitation; } }
  const cardUpload = can(admin, "letters:edit") ? field("inviteCardUpload") : "";
  if (isInvitation(invitation) || (cleanInvitation(invitation).on && cardUpload)) {
    const ref = field("previewTo") || field("to");
    // The editor's sample: an invited guest, or a registered participant with their furbabies under the name.
    const sample = !ref ? (cleanInvitation(invitation).audience === "participants" ? { name: "Jessie Mae Gabriel", contact: "", cardLine: "& Mochi and Fudge" } : { name: "Pawssion Project Foundation Inc", contact: "Ms. Malou Perez" }) : to;
    const names = cardNames(sample, readCardNames(field("cardNames"), [ref]).byRef[ref]);
    try {
      const card = await renderCard(invitation, names, { cardUpload });
      if (field("format") === "card") return new Response(card, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
      const uploads = can(admin, "letters:edit") ? data.getAll("invitePageUploads").filter((v) => typeof v === "string" && v.startsWith("data:image/")).slice(0, MAX_INVITATION_PAGES) : [];
      const prepared = prepareLetter(letter, { ...withCardName(to, readCardNames(field("cardNames"), [ref]).byRef[ref]), values });
      let pages = await extraPages(invitation, uploads);
      // A participant's own check-in QR on the last page; the editor's preview shows a sample one.
      if (type === "registration" && isUuid(id)) pages = await withPassQr(pages, invitation, (await passCodes([id], { eventId, admin })).get(id));
      else if (!ref) pages = await withPassQr(pages, invitation, "SAMPEPASS2");
      const pdf = await invitationPdf([card, ...pages], { title: prepared.subject });
      const ascii = prepared.filename.replace(/[^\x20-\x7e]/g, "-").replace(/"/g, "'");
      return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${field("download") ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(prepared.filename)}`, "Cache-Control": "no-store" } });
    } catch (error) {
      return new Response(String(error?.message || "The invitation couldn't be made."), { status: 400 });
    }
  }
  // The editor posts its unsaved signature settings (and a new image, if picked) to preview them.
  let posted = null;
  if (field("signature") && can(admin, "letters:edit")) { try { posted = JSON.parse(field("signature")); } catch { posted = null; } }
  const signature = await signatureForPdf(posted || saved.signature, posted ? field("signatureUpload") : "");
  const prepared = prepareLetter(letter, { ...to, values, signed: Boolean(signature) });
  const pdf = await letterPdf(prepared.blocks, { title: prepared.subject, signature });
  const ascii = prepared.filename.replace(/[^\x20-\x7e]/g, "-").replace(/"/g, "'");
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${field("download") ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(prepared.filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
