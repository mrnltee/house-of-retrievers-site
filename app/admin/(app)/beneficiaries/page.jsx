import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { BENEFICIARY_KINDS, BENEFICIARY_LETTER, BENEFICIARY_STATUSES, kindLabel, statusLabel } from "../../../lib/beneficiaries.mjs";
import { listLetters } from "../../../lib/letterStore";
import { Flash, NotAllowed, PageHead, formatDay } from "../ui";
import { Avatar } from "../ImageField";
import TickedSubmit from "../TickedSubmit";

const cleanParam = (value, max = 80) => String(value || "").trim().slice(0, max);

/** Beneficiaries: shelters and rescue groups, with filters, and letters like Sponsors & partners. */
export default async function BeneficiariesPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("beneficiaries:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const canEdit = can(admin, "beneficiaries:edit");
  const canSend = can(admin, "letters:edit");
  const kind = BENEFICIARY_KINDS.some(([k]) => k === params?.kind) ? params.kind : "";
  const status = BENEFICIARY_STATUSES.some(([k]) => k === params?.status) ? params.status : "";
  const q = cleanParam(params?.q);
  const [rows, letters] = await Promise.all([
    sql(
      `SELECT * FROM beneficiaries WHERE deleted_at IS NULL AND ($1 = '' OR kind = $1) AND ($2 = '' OR status = $2)
          AND ($3 = '' OR name ILIKE '%' || $3 || '%' OR coalesce(location,'') ILIKE '%' || $3 || '%' OR coalesce(contact_name,'') ILIKE '%' || $3 || '%')
        ORDER BY array_position(ARRAY['partnered','talking','prospect','ended'], status), name`,
      [kind, status, q],
    ),
    listLetters(),
  ]);
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  const filtered = Boolean(kind || status || q);

  return (
    <>
      <PageHead title="Beneficiaries" lead="The animal shelters and rescue groups HOR supports or plans to. Tick them to send the beneficiary proposal (or any letter); you check it before anything goes out.">
        {canEdit && <a className="btn dark" href={`${base}/beneficiaries/new`}>+ Add beneficiary</a>}
      </PageHead>
      <Flash params={params} />
      <form method="get" action={`${base}/beneficiaries`} className="card actions" role="search" style={{ flexWrap: "wrap", gap: 10 }}>
        <select name="kind" defaultValue={kind} aria-label="Type"><option value="">All types</option>{BENEFICIARY_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select name="status" defaultValue={status} aria-label="Status"><option value="">All statuses</option>{BENEFICIARY_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input name="q" defaultValue={q} placeholder="Search name, place, contact" aria-label="Search" />
        <button className="btn ghost" type="submit" data-confirm="not-needed-read-only">Filter</button>
        {filtered && <a className="small" href={`${base}/beneficiaries`}>Clear</a>}
      </form>

      <form method="get" action={`${base}/letters/send`} className="card" style={{ marginTop: 16 }}>
        <input type="hidden" name="letter" value={BENEFICIARY_LETTER} />
        {canSend && rows.length > 0 && (
          <div className="actions" style={{ flexWrap: "wrap" }}>
            <TickedSubmit>✉ Send the proposal to ticked</TickedSubmit>
            <span className="small muted">Letter: <a href={`${base}/letters/${BENEFICIARY_LETTER}`}>{letterName(BENEFICIARY_LETTER)}</a>. You can pick another letter on the next page.</span>
          </div>
        )}
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table>
            <thead><tr>{canSend && <th><span className="sr-only">Pick</span></th>}<th>Name</th><th>Type</th><th>Status</th><th>Contact</th><th>Greeting</th><th>Last letter</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {canSend && <td><input type="checkbox" name="to" value={`beneficiary:${r.id}`} aria-label={`Pick ${r.name}`} /></td>}
                  <td className="strong"><span className="row-name"><Avatar photo={r.photo} logo={r.logo} name={r.name} /><span><a href={`${base}/beneficiaries/${r.id}`}>{r.name}</a>{r.location && <><br /><span className="small muted">{r.location}</span></>}</span></span></td>
                  <td>{kindLabel(r.kind)}</td>
                  <td><span className="chip">{statusLabel(r.status)}</span></td>
                  <td>{r.contact_name || "—"}{r.contact_email ? <><br /><span className="small muted">{r.contact_email}</span></> : <><br /><span className="small muted">No email yet</span></>}</td>
                  <td className="small">Dear {r.salutation || r.contact_name || r.name},</td>
                  <td className="small">{r.last_sent_at ? `${letterName(r.last_letter)} · ${formatDay(r.last_sent_at)}` : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={canSend ? 7 : 6} className="muted">{filtered ? "No beneficiaries match these filters." : "No beneficiaries yet."} {canEdit && !filtered && <a href={`${base}/beneficiaries/new`}>+ Add the first one</a>}</td></tr>}
            </tbody>
          </table>
        </div>
      </form>
    </>
  );
}
