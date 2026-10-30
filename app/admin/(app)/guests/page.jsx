import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { CONTACT_CATEGORIES, categoryOf } from "../../../lib/contacts.mjs";
import { listLetters } from "../../../lib/letterStore";
import { saveContact } from "../../contactActions";
import { Flash, NotAllowed, PageHead, formatDay } from "../ui";
import ContactFields from "./ContactFields";
import ConfirmButton from "../ConfirmButton";

/**
 * Guest list: celebrities, influencers, politicians, VIPs, media, speakers,
 * sponsors and partners, grouped by the letter each category gets. Sponsors
 * and partners already in Sponsors & partners show in their groups too.
 */
export default async function GuestsPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("letters:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const canEdit = can(admin, "letters:edit");
  const only = categoryOf(params?.category)?.key || "";
  const q = String(params?.q || "").trim().slice(0, 80);
  const [contacts, supporters, letters] = await Promise.all([
    sql(
      `SELECT * FROM letter_contacts WHERE deleted_at IS NULL AND ($1 = '' OR category = $1)
          AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR coalesce(organization,'') ILIKE '%' || $2 || '%' OR coalesce(email,'') ILIKE '%' || $2 || '%')
        ORDER BY name`,
      [only, q],
    ),
    sql(
      `SELECT id, name, kind, status, contact_email FROM supporters WHERE status <> 'ended'
          AND ($1 = '' OR name ILIKE '%' || $1 || '%') ORDER BY name`,
      [q],
    ),
    listLetters(),
  ]);
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  const groups = CONTACT_CATEGORIES.filter((c) => !only || c.key === only).map((c) => ({
    ...c,
    rows: [
      ...contacts.filter((r) => r.category === c.key).map((r) => ({ ref: `contact:${r.id}`, id: r.id, name: r.name, sub: r.organization, email: r.email, href: `${base}/guests/${r.id}`, last: r.last_sent_at ? `${letterName(r.last_letter)} · ${formatDay(r.last_sent_at)}` : "" })),
      ...supporters.filter((s) => (c.key === "sponsor" && s.kind === "Sponsor") || (c.key === "partner" && s.kind === "Partner"))
        .map((s) => ({ ref: `supporter:${s.id}`, id: s.id, name: s.name, sub: "From Sponsors & partners", email: s.contact_email, href: `${base}/supporters/${s.id}`, last: "" })),
    ],
  }));

  return (
    <>
      <PageHead title="Guest list" lead="Everyone HOR sends letters to, grouped by category. Each category gets its own letter; tick people in a group and send it. You check the letter before anything goes out." />
      <Flash params={params} />
      <form method="get" action={`${base}/guests`} className="card actions" role="search" style={{ flexWrap: "wrap", gap: 10 }}>
        <select name="category" defaultValue={only} aria-label="Category">
          <option value="">All categories</option>
          {CONTACT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="Search name, company, email" aria-label="Search" />
        <button className="btn ghost" type="submit" data-confirm="not-needed-read-only">Filter</button>
        {(only || q) && <a className="small" href={`${base}/guests`}>Clear</a>}
      </form>

      {canEdit && (
        <details className="card" open={params?.add === "1"}>
          <summary className="strong">+ Add someone</summary>
          <form action={saveContact} className="form" style={{ marginTop: 12 }}>
            <ContactFields category={only} />
            <div className="actions"><ConfirmButton className="btn dark" title="Add to the guest list?" items={["They show in their category, ready for that category's letter."]}>Add to the guest list</ConfirmButton></div>
          </form>
        </details>
      )}

      {groups.map((g) => (
        <section key={g.key} className="card" style={{ marginTop: 16 }}>
          <form method="get" action={`${base}/letters/send`}>
            <input type="hidden" name="letter" value={g.letter} />
            <div className="actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>{g.label} <span className="muted small">({g.rows.length})</span></h2>
                <p className="small muted" style={{ margin: "4px 0 0" }}>Letter: <a href={`${base}/letters/${g.letter}`}>{letterName(g.letter)}</a></p>
              </div>
              {canEdit && g.rows.length > 0 && <button type="submit" className="btn dark" data-confirm="not-needed-read-only">✉ Send this letter to ticked</button>}
            </div>
            {g.rows.length === 0 ? (
              <p className="small muted">No one here yet.</p>
            ) : (
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table>
                  <thead><tr>{canEdit && <th><span className="sr-only">Pick</span></th>}<th>Name</th><th>Email</th><th>Last letter</th></tr></thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.ref}>
                        {canEdit && <td><input type="checkbox" name="to" value={r.ref} aria-label={`Pick ${r.name}`} /></td>}
                        <td className="strong"><a href={r.href}>{r.name}</a>{r.sub && <><br /><span className="small muted">{r.sub}</span></>}</td>
                        <td>{r.email || <span className="muted">No email yet</span>}</td>
                        <td className="small">{r.last || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </form>
        </section>
      ))}
    </>
  );
}
