import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { emailReady } from "../../../../lib/email";
import { MAX_LETTER_RECIPIENTS, blanksOf, recipientName } from "../../../../lib/letters.mjs";
import { listLetters, savedValues } from "../../../../lib/letterStore";
import { STATUSES } from "../../../../lib/supporters.mjs";
import { Flash, NotAllowed, PageHead } from "../../ui";
import LetterSend from "./LetterSend";

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
  const { allowed } = await pageAdmin("people:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const letters = await listLetters();
  const letter = letters.find((l) => l.key === params?.letter) || letters[0];

  const refs = list(params?.to);
  const supporterIds = refs.filter((r) => r.startsWith("supporter:")).map((r) => r.slice(10)).filter(isUuid);
  const personIds = refs.filter((r) => r.startsWith("person:")).map((r) => r.slice(7)).filter(isUuid);
  let supporters = supporterIds.length ? await sql("SELECT id, name, kind, status, contact_email FROM supporters WHERE id = ANY($1::uuid[]) ORDER BY name", [supporterIds]) : [];
  if (params?.all === "1") {
    const kind = ["Sponsor", "Partner"].includes(params?.kind) ? params.kind : "";
    const status = STATUSES.some(([key]) => key === params?.status) ? params.status : "";
    const label = clean(params?.label, 60);
    const q = clean(params?.q);
    supporters = await sql(
      `SELECT id, name, kind, status, contact_email FROM supporters
        WHERE ($1 = '' OR kind = $1) AND ($2 = '' OR status = $2) AND ($3 = '' OR category_label = $3)
          AND ($4 = '' OR name ILIKE '%' || $4 || '%' OR coalesce(code, '') ILIKE '%' || $4 || '%' OR coalesce(category_label, '') ILIKE '%' || $4 || '%')
        ORDER BY name`,
      [kind, status, label, q],
    );
  }
  const people = personIds.length ? await sql("SELECT id, name, email, organization, kind FROM people WHERE id = ANY($1::uuid[]) ORDER BY name", [personIds]) : [];
  const recipients = [
    ...supporters.map((s) => ({ ref: `supporter:${s.id}`, name: recipientName({ supporter: s }), email: (s.contact_email || "").trim(), note: `${s.kind} · ${s.status}`, href: `${base}/supporters/${s.id}` })),
    ...people.map((p) => ({ ref: `person:${p.id}`, name: recipientName({ person: p }), email: (p.email || "").trim(), note: p.organization ? `${p.kind} · ${p.name}` : p.kind, href: `${base}/people/${p.id}` })),
  ];

  const blanks = blanksOf(letter.subject, letter.cover, letter.body);
  const saved = await savedValues(blanks.map((b) => b.label));
  const backQuery = new URLSearchParams();
  backQuery.set("letter", letter.key);
  for (const r of recipients) backQuery.append("to", r.ref);

  return (
    <>
      <p className="small"><a href={`${base}/supporters?view=list`}>← Sponsors & partners</a> · <a href={`${base}/letters`}>Letters</a></p>
      <PageHead title="Send a letter" lead={`The letter is filled in with each recipient's name and sent as a PDF attached to a short email. Up to ${MAX_LETTER_RECIPIENTS} at a time.`} />
      <Flash params={params} />
      {recipients.length === 0 ? (
        <p className="card muted">No recipients picked. In <a href={`${base}/supporters?view=list`}>Sponsors & partners</a>, tick the records and choose “Send a letter”, or open someone in People and choose “Send a letter”.</p>
      ) : (
        <LetterSend
          letters={letters.map((l) => ({ key: l.key, name: l.name }))}
          letter={letter}
          blanks={blanks}
          saved={saved}
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
