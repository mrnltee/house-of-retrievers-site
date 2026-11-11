import { loadEmailFrame } from "../../../../lib/emailSettings";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { emailReady } from "../../../../lib/email";
import { MAX_LETTER_RECIPIENTS, blanksOf, recipientFields } from "../../../../lib/letters.mjs";
import { groupLetters, listLetters, savedAnswers, signatureCheck } from "../../../../lib/letterStore";
import { STATUSES } from "../../../../lib/supporters.mjs";
import { Flash, NotAllowed, PageHead } from "../../ui";
import LetterSend from "./LetterSend";
import { eventFills } from "../../../../lib/letterEventStore";
import { listDesigns, loadDesign, loadHouse } from "../../../../lib/emailDesignStore";
import { designTexts } from "../../../../lib/emailDesign.mjs";
import { categoryOf, letterEmails, letterFor } from "../../../../lib/contacts.mjs";
import { registrationRecipients } from "../../../../lib/letterRegistrations";

export const maxDuration = 120;

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((v) => typeof v === "string");
const clean = (value, max = 80) => String(value || "").trim().slice(0, max);

/**
 * Send a letter. Recipients come from Brands & Partners (?to=supporter:<id>,
 * or ?all=1 with that page's filters) or People (?to=person:<id>).
 */
export default async function SendLetterPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("letters:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const allLetters = await listLetters();
  const picked = allLetters.find((l) => l.key === params?.letter) || allLetters[0];

  // For an event (from its Brand tracker, or an event's own letter): its details fill the [Event …] blanks.
  const eventId = isUuid(params?.event) ? params.event : picked?.eventId || null;
  const [event] = eventId ? await sql("SELECT id, title FROM events WHERE id = $1", [eventId]) : [];
  // The letters to choose from: the general ones, plus this event's own.
  const letters = allLetters.filter((l) => !l.eventId || l.eventId === event?.id);
  const letter = letters.find((l) => l.key === picked?.key) || letters[0];

  const refs = list(params?.to);
  const supporterIds = refs.filter((r) => r.startsWith("supporter:")).map((r) => r.slice(10)).filter(isUuid);
  const personIds = refs.filter((r) => r.startsWith("person:")).map((r) => r.slice(7)).filter(isUuid);
  let supporters = supporterIds.length ? await sql("SELECT id, name, kind, status, contact_email, contact_name, address, salutation, greeting FROM supporters WHERE id = ANY($1::uuid[]) ORDER BY name", [supporterIds]) : [];
  if (params?.all === "1") {
    const kind = ["Sponsor", "Partner"].includes(params?.kind) ? params.kind : "";
    const status = STATUSES.some(([key]) => key === params?.status) ? params.status : "";
    const label = clean(params?.label, 60);
    const q = clean(params?.q);
    supporters = await sql(
      `SELECT id, name, kind, status, contact_email, contact_name, address, salutation, greeting FROM supporters
        WHERE ($1 = '' OR kind = $1) AND ($2 = '' OR status = $2) AND ($3 = '' OR category_label = $3)
          AND ($4 = '' OR name ILIKE '%' || $4 || '%' OR coalesce(code, '') ILIKE '%' || $4 || '%' OR coalesce(category_label, '') ILIKE '%' || $4 || '%')
        ORDER BY name`,
      [kind, status, label, q],
    );
  }
  const contactIds = refs.filter((r) => r.startsWith("contact:")).map((r) => r.slice(8)).filter(isUuid);
  const contacts = contactIds.length ? await sql("SELECT id, name, organization, email, rep_email, send_to, category, address, salutation FROM letter_contacts WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL ORDER BY name", [contactIds]) : [];
  const beneficiaryIds = refs.filter((r) => r.startsWith("beneficiary:")).map((r) => r.slice(12)).filter(isUuid);
  const beneficiaries = beneficiaryIds.length ? await sql("SELECT id, name, contact_name, contact_email, address, salutation, kind, status FROM beneficiaries WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL ORDER BY name", [beneficiaryIds]) : [];
  const people = personIds.length ? await sql("SELECT id, name, email, organization, kind FROM people WHERE id = ANY($1::uuid[]) ORDER BY name", [personIds]) : [];
  // Registered participants (an event's Registrations → Send invitation cards); only confirmed ones load.
  const registrations = await registrationRecipients(refs.filter((r) => r.startsWith("registration:")).map((r) => r.slice(13)));
  const recipients = [
    ...registrations.map((r) => ({ ...r, note: "Registered participant", href: event ? `${base}/registrations/${event.id}/r/${r.id}` : "" })),
    ...supporters.map((s) => ({ ref: `supporter:${s.id}`, ...recipientFields({ supporter: s }), email: (s.contact_email || "").trim(), note: `${s.kind} · ${s.status}`, href: `${base}/supporters/${s.id}` })),
    ...contacts.map((c) => ({ ref: `contact:${c.id}`, ...recipientFields({ contact: c }), email: letterEmails(c).to, cc: letterEmails(c).cc, note: categoryOf(c.category)?.label || "Guest list", href: `${base}/guests/${c.id}`, category: c.category })),
    ...beneficiaries.map((b) => ({ ref: `beneficiary:${b.id}`, ...recipientFields({ beneficiary: b }), email: (b.contact_email || "").trim(), note: "Beneficiary", href: `${base}/beneficiaries/${b.id}`, category: "beneficiary" })),
    ...people.map((p) => ({ ref: `person:${p.id}`, ...recipientFields({ person: p }), email: (p.email || "").trim(), note: p.organization ? `${p.kind} · ${p.name}` : p.kind, href: `${base}/people/${p.id}` })),
  ];

  // Guest list people whose category is meant for a different letter.
  const chosen = await groupLetters();
  const mismatched = recipients.filter((r) => r.category && letterFor(r.category, chosen) !== letter.key);

  const blanks = blanksOf(letter.subject, letter.cover, letter.body);
  // Brand email designs to pick from: this event's copies first, then the library, with their documents.
  const designRows = await listDesigns({ eventId: event?.id || null });
  const designs = (await Promise.all(designRows.map((d) => loadDesign(d.id)))).filter(Boolean)
    .map((d) => ({ id: d.id, kind: d.kind, name: d.name, subject: d.subject, doc: d.doc, forEvent: Boolean(d.event_id) }));
  const designLabels = designs.flatMap((d) => blanksOf(...designTexts(d.doc, d.subject)).map((b) => b.label));
  const answers = await savedAnswers([...new Set([...blanks.map((b) => b.label), ...designLabels])]);
  const saved = { ...answers.values, ...(event ? await eventFills(event.id) : {}) };
  const standard = [...answers.standard];
  // Who the email comes from, as recipients see it (e.g. "House of Retrievers <hello@…>").
  const from = process.env.EMAIL_FROM || process.env.ADMIN_ALERT_FROM || "";
  const backQuery = new URLSearchParams();
  backQuery.set("letter", letter.key);
  for (const r of recipients) backQuery.append("to", r.ref);
  if (event) backQuery.set("event", event.id);
  // Which event list the send started from (Brand tracker, Guest list or Donors), to go back there after.
  if (event && ["brands", "guests", "donors", "registrations"].includes(params?.list)) backQuery.set("list", params.list);

  return (
    <>
      <p className="small">Back to <a href={`${base}/guests`}>Guest list</a> · <a href={`${base}/beneficiaries`}>Beneficiaries</a> · <a href={`${base}/supporters?view=list`}>Brands & Partners</a> · <a href={`${base}/letters`}>Letters</a></p>
      {event && <p className="card small">For <strong>{event.title}</strong>: these letters are tracked on its <a href={params?.list === "registrations" ? `${base}/registrations/${event.id}` : `${base}/events/${event.id}/${["guests", "donors"].includes(params?.list) ? params.list : "brands"}`}>{params?.list === "registrations" ? "Registrations" : params?.list === "guests" ? "Guest list" : params?.list === "donors" ? "Donors" : "Brand tracker"}</a>, and its details fill in [Event Name], [Event Date], [Event Sponsors] and the other event fill-ins.</p>}
      <PageHead title="Send a letter" lead={`The letter is filled in with each recipient's name and sent as a PDF attached to a short email, or written in the email itself. Up to ${MAX_LETTER_RECIPIENTS} at a time.`} />
      <Flash params={params} />
      {mismatched.length > 0 && <p className="card" role="alert" style={{ borderLeft: "4px solid #b8860b" }}>Check the letter: {mismatched.map((r) => `${r.name} (${r.note})`).join(", ")} {mismatched.length === 1 ? "is" : "are"} usually sent a different letter.</p>}
      {recipients.length === 0 ? (
        <p className="card muted">No recipients picked. In the <a href={`${base}/guests`}>Guest list</a>, <a href={`${base}/beneficiaries`}>Beneficiaries</a> or <a href={`${base}/supporters?view=list`}>Brands & Partners</a>, tick people and press Send, or open someone in People and choose “Send a letter”.</p>
      ) : (
        <LetterSend frame={await loadEmailFrame()}
          letters={letters.map((l) => ({ key: l.key, name: l.name }))}
          letter={letter}
          blanks={blanks}
          saved={saved}
          standard={standard}
          from={from}
          detailsHref={`${base}/letters/details`}
          editHref={`${base}/letters/${letter.key}`}
          signatureCheck={await signatureCheck(letter.signature, letter.body)}
          recipients={recipients}
          max={MAX_LETTER_RECIPIENTS}
          ready={emailReady()}
          pdfAction={`${base}/letters/pdf`}
          back={`/letters/send?${backQuery.toString()}`}
          eventId={event?.id || ""}
          designs={designs}
          house={designs.length ? await loadHouse() : null}
        />
      )}
    </>
  );
}
