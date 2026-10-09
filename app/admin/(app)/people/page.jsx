import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { updatePerson } from "../../actions";
import { PEOPLE_KINDS, PEOPLE_STATUSES } from "../../../lib/admin/people.mjs";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";

const KINDS = PEOPLE_KINDS;
const STATUSES = PEOPLE_STATUSES;
const HELP = {
  Member: "Contact them, add them to the Instagram group chat, then mark them Added.",
  Volunteer: "Under 18s volunteer only with a parent or guardian. Check before marking Onboarded.",
  Sponsor: "Do the conflict-of-interest check before marking Confirmed.",
  Partner: "Agree the beneficiary before marking Confirmed.",
};

export default async function PeoplePage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("people:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const kind = KINDS.includes(params?.kind) ? params.kind : "Member";
  const q = typeof params?.q === "string" ? params.q.trim().slice(0, 80) : "";
  const [counts, rows] = await Promise.all([
    sql("SELECT kind, count(*)::int AS count FROM people GROUP BY kind"),
    sql(
      `SELECT * FROM people WHERE kind=$1
         AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%' OR social_profile ILIKE '%' || $2 || '%')
       ORDER BY (status = 'New') DESC, created_at DESC LIMIT 200`,
      [kind, q],
    ),
  ]);
  const count = (k) => counts.find((row) => row.kind === k)?.count || 0;
  const canEdit = can(admin.roles, "people:edit");

  return (
    <>
      <PageHead title="People" lead="Everyone who used the Join form. Set a status as you follow up, so the next admin knows where things stand.">
        <a className="btn ghost" href={`${base}/people/export?kind=${kind}`}>Export CSV</a>
      </PageHead>
      <Flash params={params} />
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <nav className="tabs" aria-label="Kind">
          {KINDS.map((k) => (
            <a key={k} href={`${base}/people?kind=${k}`} aria-current={kind === k ? "page" : undefined}>{k}s · {count(k)}</a>
          ))}
        </nav>
        <form role="search" className="actions">
          <input type="hidden" name="kind" value={kind} />
          <label className="visually-hidden" htmlFor="people-q">Search</label>
          <input id="people-q" type="search" name="q" defaultValue={q} placeholder="Search name, email or handle" style={{ width: 260 }} />
        </form>
      </div>
      <p className="small muted">{HELP[kind]}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Contact</th>{kind === "Member" || kind === "Volunteer" ? <th>Furbaby</th> : <th>Organization</th>}<th>Joined</th><th>Message</th><th>Status and notes</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="empty">Nobody here yet.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="strong">{p.name}</td>
                <td>
                  <a href={`mailto:${p.email}`}>{p.email}</a>
                  {p.social_profile && <><br />{p.social_url ? <a href={p.social_url} target="_blank" rel="noreferrer">{p.social_profile}</a> : p.social_profile}</>}
                </td>
                <td>{(kind === "Member" || kind === "Volunteer" ? p.furbaby_name : p.organization) || "—"}</td>
                <td>{formatWhen(p.created_at)}</td>
                <td style={{ maxWidth: 260 }}>{p.message || "—"}</td>
                <td>
                  {canEdit ? (
                    <form action={updatePerson} className="form" style={{ gap: 8, minWidth: 220 }}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="kind" value={kind} />
                      <label className="visually-hidden" htmlFor={`st-${p.id}`}>Status for {p.name}</label>
                      <select id={`st-${p.id}`} name="status" defaultValue={p.status}>
                        {STATUSES[kind].map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <label className="visually-hidden" htmlFor={`nt-${p.id}`}>Notes for {p.name}</label>
                      <input id={`nt-${p.id}`} type="text" name="notes" maxLength={500} defaultValue={p.notes || ""} placeholder="Notes" />
                      <button className="btn small ghost">Save</button>
                    </form>
                  ) : (
                    <span className={`chip ${p.status === "New" ? "warn" : ""}`}>{p.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
