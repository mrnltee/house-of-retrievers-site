import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { emailReady } from "../../../../lib/email";
import { MAX_LETTER_RECIPIENTS, blanksOf, recipientFields } from "../../../../lib/letters.mjs";
import { groupLetters, listLetters, savedAnswers } from "../../../../lib/letterStore";
import { STATUSES } from "../../../../lib/supporters.mjs";
import { Flash, NotAllowed, PageHead } from "../../ui";
import LetterSend from "./LetterSend";
import { categoryOf, letterFor } from "../../../../lib/contacts.mjs";

export const maxDuration = 120;

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((v) => typeof v === "string");
const clean = (value, max = 80) => String(value || "").trim().slice(0, max);

/**
 * Send a letter. Recipients come from Sponsors & partners (?to=supporter:<id>,
 * or ?all=1 with that page's filters) or People (?to=person:<id>).
 */
export default async function SendLetterPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("letters:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const letters = await listLetters();
  const letter = letters.find((l) => l.key === params?.letter) || letters[0];

  const refs = list(params?.to);
  const supporterIds = refs.filter((r) => r.startsWith("supporter:")).map((r) => r.slice(10)).filter(isUuid);
  const personIds = refs.filter((r) => r.startsWith("person:")).map((r) => r.slice(7)).filter(isUuid);
  let supporters = supporterIds.length ? await sql("SELECT id, name, kind, status, contact_email, contact_name, address, salutation FROM supporters WHERE id = ANY($1::uuid[]) ORDER BY name", [supporterIds]) : [];
  if (params?.all === "1") {
    const kind = ["Sponsor", "Partner"].includes(params?.kind) ? params.kind : "";
    const status = STATUSES.some(([key]) => key === params?.status) ? params.status : "";
    const label = clean(params?.label, 60);
    const q = clean(params?.q);
    supporters = await sql(
      `SELECT id, name, kind, status, contact_email, contact_name, address, salutation FROM supporters
        WHERE ($1 = '' OR kind = $1) AND ($2 = '' OR status = $2) AND ($3 = '' OR category_label = $3)
          AND ($4 = '' OR name ILIKE '%' || $4 || '%' OR coalesce(code, '') ILIKE '%' || $4 || '%' OR coalesce(category_label, '') ILIKE '%' || $4 || '%')
        ORDER BY name`,
      [kind, status, label, q],
    );
  }
  const contactIds = refs.filter((r) => r.startsWith("contact:")).map((r) => r.slice(8)).filter(isUuid);
  const contacts = contactIds.length ? await sql("SELECT id, name, organization, email, category, address, salutation FROM letter_contacts WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL ORDER BY name", [contactIds]) : [];
  const beneficiaryIds = refs.filter((r) => r.startsWith("beneficiary:")).map((r) => r.slice(12)).filter(isUuid);
  const beneficiaries = beneficiaryIds.length ? await sql("SELECT id, name, contact_name, contact_email, address, salutation, kind, status FROM beneficiaries WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL ORDER BY name", [beneficiaryIds]) : [];
  const people = personIds.length ? await sql("SELECT id, name, email, organization, kind FROM people WHERE id = ANY($1::uuid[]) ORDER BY name", [personIds]) : [];
  const recipients = [
    ...supporters.map((s) => ({ ref: `supporter:${s.id}`, ...recipientFields({ supporter: s }), email: (s.contact_email || "").trim(), note: `${s.kind} · ${s.status}`, href: `${base}/supporters/${s.id}` })),
    ...contacts.map((c) => ({ ref: `contact:${c.id}`, ...recipientFields({ contact: c }), email: (c.email || "").trim(), note: categoryOf(c.category)?.label || "Guest list", href: `${base}/guests/${c.id}`, category: c.category })),
    ...beneficiaries.map((b) => ({ ref: `beneficiary:${b.id}`, ...recipientFields({ beneficiary: b }), email: (b.contact_email || "").trim(), note: "Beneficiary", href: `${base}/beneficiaries/${b.id}`, category: "beneficiary" })),
    ...people.map((p) => ({ ref: `person:${p.id}`, ...recipientFields({ person: p }), email: (p.email || "").trim(), note: p.organization ? `${p.kind} · ${p.name}` : p.kind, href: `${base}/people/${p.id}` })),
  ];

  // Guest list people whose category is meant for a different letter.
  const chosen = await groupLetters();
  const mismatched = recipients.filter((r) => r.category && letterFor(r.category, chosen) !== letter.key);

  const blanks = blanksOf(letter.subject, letter.cover, letter.body);
  const answers = await savedAnswers(blanks.map((b) => b.label));
  const saved = answers.values;
  const standard = [...answers.standard];
  // Who the email comes from, as recipients see it (e.g. "House of Retrievers <hello@…>").
  const from = process.env.EMAIL_FROM || process.env.ADMIN_ALERT_FROM || "";
  const backQuery = new URLSearchParams();
  backQuery.set("letter", letter.key);
  for (const r of recipients) backQuery.append("to", r.ref);

  return (
    <>
      <p className="small"><a href={`${base}/supporters?view=list`}>← Sponsors & partners</a> · <a href={`${base}/letters`}>Letters</a></p>
      <PageHead title="Send a letter" lead={`The letter is filled in with each recipient's name and sent as a PDF attached to a short email. Up to ${MAX_LETTER_RECIPIENTS} at a time.`} />
      <Flash params={params} />
      {mismatched.length > 0 && <p className="card" role="alert" style={{ borderLeft: "4px solid #b8860b" }}>Check the letter: {mismatched.map((r) => `${r.name} (${r.note})`).join(", ")} {mismatched.length === 1 ? "is" : "are"} usually sent a different letter.</p>}
      {recipients.length === 0 ? (
        <p className="card muted">No recipients picked. In the <a href={`${base}/guests`}>Guest list</a> or <a href={`${base}/supporters?view=list`}>Sponsors & partners</a>, tick the records and choose “Send a letter”, or open someone in People and choose “Send a letter”.</p>
      ) : (
        <LetterSend
          letters={letters.map((l) => ({ key: l.key, name: l.name }))}
          letter={letter}
          blanks={blanks}
          saved={saved}
          standard={standard}
          from={from}
          detailsHref={`${base}/letters/details`}
          recipients={recipients}
          max={MAX_LETTER_RECIPIENTS}
          ready={emailReady()}
          pdfAction={`${base}/letters/pdf`}
          back={`/letters/send?${backQuery.toString()}`}
        />
      )}
    </>
  );
}
