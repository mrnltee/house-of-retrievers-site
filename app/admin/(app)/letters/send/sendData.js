import { loadEmailFrame } from "../../../../lib/emailSettings";
import { sql } from "../../../../lib/db";
import { emailReady } from "../../../../lib/email";
import { MAX_LETTER_RECIPIENTS, blanksOf, recipientFields } from "../../../../lib/letters.mjs";
import { groupLetters, listLetters, savedAnswers, signatureCheck } from "../../../../lib/letterStore";
import { STATUSES } from "../../../../lib/supporters.mjs";
import { eventFills } from "../../../../lib/letterEventStore";
import { listDesigns, loadDesign, loadHouse } from "../../../../lib/emailDesignStore";
import { designTexts } from "../../../../lib/emailDesign.mjs";
import { categoryOf, letterEmails, letterFor } from "../../../../lib/contacts.mjs";
import { eventParticipantIds, registrationRecipients } from "../../../../lib/letterRegistrations";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((v) => typeof v === "string");
const clean = (value, max = 80) => String(value || "").trim().slice(0, max);

/** A query string (the send window) → the same shape as a page's searchParams. */
export function paramsFromQuery(query) {
  const params = {};
  for (const [key, value] of new URLSearchParams(String(query || "").replace(/^[^?]*\?/, ""))) {
    if (key in params) params[key] = [...list(params[key]), value];
    else params[key] = value;
  }
  return params;
}

/**
 * Everything the send page and the send window need (owner, 2026-11-12: one
 * loader for both). Recipients come from the query: ?to=supporter:<id>,
 * contact:, beneficiary:, person:, registration:, or ?all=1 (Brands & Partners
 * filters), or ?participants=all&event=<id> (every confirmed participant of
 * that event). ?pick=unsent ticks only those who haven't had this letter yet.
 */
export async function loadSendData(params, { admin, base }) {
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
  // Registered participants: named ones, or every confirmed participant of the event (participants=all).
  const registrationIds = [
    ...refs.filter((r) => r.startsWith("registration:")).map((r) => r.slice(13)),
    ...(params?.participants === "all" && event ? await eventParticipantIds(event.id, { admin }) : []),
  ];
  const registrations = await registrationRecipients(registrationIds, { eventId: event?.id, admin });
  const recipients = [
    ...registrations.map((r) => ({ ...r, note: "Registered participant", href: event ? `${base}/registrations/${event.id}/r/${r.id}` : "" })),
    ...supporters.map((s) => ({ ref: `supporter:${s.id}`, ...recipientFields({ supporter: s }), email: (s.contact_email || "").trim(), note: `${s.kind} · ${s.status}`, href: `${base}/supporters/${s.id}` })),
    ...contacts.map((c) => ({ ref: `contact:${c.id}`, ...recipientFields({ contact: c }), email: letterEmails(c).to, cc: letterEmails(c).cc, note: categoryOf(c.category)?.label || "Guest list", href: `${base}/guests/${c.id}`, category: c.category })),
    ...beneficiaries.map((b) => ({ ref: `beneficiary:${b.id}`, ...recipientFields({ beneficiary: b }), email: (b.contact_email || "").trim(), note: "Beneficiary", href: `${base}/beneficiaries/${b.id}`, category: "beneficiary" })),
    ...people.map((p) => ({ ref: `person:${p.id}`, ...recipientFields({ person: p }), email: (p.email || "").trim(), note: p.organization ? `${p.kind} · ${p.name}` : p.kind, href: `${base}/people/${p.id}` })),
  ];

  // Who already had this letter (not failed or bounced), so the list can say so and leave them unticked.
  if (letter && recipients.length) {
    const sends = await sql(
      `SELECT ref, max(sent_at) AS at FROM letter_sends WHERE letter_key = $1 AND ref = ANY($2::text[]) AND status NOT IN ('failed', 'bounced') GROUP BY ref`,
      [letter.key, recipients.map((r) => r.ref)],
    ).catch(() => []);
    const sentAt = new Map(sends.map((s) => [s.ref, new Date(s.at).toISOString()]));
    for (const r of recipients) if (sentAt.has(r.ref)) r.sentAt = sentAt.get(r.ref);
  }
  // Who starts ticked: everyone with an email, or (pick=unsent) only those not sent yet; never over the send limit.
  const tickable = recipients.filter((r) => r.email && (params?.pick !== "unsent" || !r.sentAt));
  const initialPicked = tickable.slice(0, MAX_LETTER_RECIPIENTS).map((r) => r.ref);

  // Guest list people whose category is meant for a different letter.
  const chosen = await groupLetters();
  const mismatched = recipients.filter((r) => r.category && letterFor(r.category, chosen) !== letter.key).map((r) => ({ name: r.name, note: r.note }));

  const blanks = blanksOf(letter.subject, letter.cover, letter.body);
  // Brand email designs to pick from: this event's copies first, then the library, with their documents.
  const designRows = await listDesigns({ eventId: event?.id || null });
  const designs = (await Promise.all(designRows.map((d) => loadDesign(d.id)))).filter(Boolean)
    .map((d) => ({ id: d.id, kind: d.kind, name: d.name, subject: d.subject, doc: d.doc, forEvent: Boolean(d.event_id) }));
  const designLabels = designs.flatMap((d) => blanksOf(...designTexts(d.doc, d.subject)).map((b) => b.label));
  const answers = await savedAnswers([...new Set([...blanks.map((b) => b.label), ...designLabels])]);
  const saved = { ...answers.values, ...(event ? await eventFills(event.id) : {}) };
  // Who the email comes from, as recipients see it (e.g. "House of Retrievers <hello@…>").
  const from = process.env.EMAIL_FROM || process.env.ADMIN_ALERT_FROM || "";
  const backQuery = new URLSearchParams();
  backQuery.set("letter", letter.key);
  for (const r of recipients) backQuery.append("to", r.ref);
  if (event) backQuery.set("event", event.id);
  // Which event list the send started from (Brand tracker, Guest list or Donors), to go back there after.
  const listName = event && ["brands", "guests", "donors", "registrations"].includes(params?.list) ? params.list : "";
  if (listName) backQuery.set("list", listName);

  return {
    event: event ? { id: event.id, title: event.title } : null,
    listName,
    mismatched,
    props: {
      frame: await loadEmailFrame(),
      letters: letters.map((l) => ({ key: l.key, name: l.name })),
      letter,
      blanks,
      saved,
      standard: [...answers.standard],
      from,
      detailsHref: `${base}/letters/details`,
      editHref: `${base}/letters/${letter.key}`,
      signatureCheck: await signatureCheck(letter.signature, letter.body),
      recipients,
      initialPicked,
      max: MAX_LETTER_RECIPIENTS,
      ready: emailReady(),
      pdfAction: `${base}/letters/pdf`,
      back: `/letters/send?${backQuery.toString()}`,
      eventId: event?.id || "",
      designs,
      house: designs.length ? await loadHouse() : null,
    },
  };
}
