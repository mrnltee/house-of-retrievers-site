import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { updatePerson } from "../../actions";
import { MEMBERSHIP, PEOPLE_KINDS, PEOPLE_STATUSES, memberNumber, membershipLabel } from "../../../lib/admin/people.mjs";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";
import PersonAvatar from "./PersonAvatar";

const KINDS = PEOPLE_KINDS;
const STATUSES = PEOPLE_STATUSES;
const HELP = {
  Member: "Contact them and add them to the group chat. Open someone to confirm their membership and send the welcome email.",
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
  const filter = MEMBERSHIP.some(([k]) => k === params?.m) ? params.m : "";
  const [counts, rows, [stats]] = await Promise.all([
    sql("SELECT kind, count(*)::int AS count FROM people GROUP BY kind"),
    sql(
      `SELECT p.*, (SELECT count(*)::int FROM registrations r WHERE lower(r.email) = lower(p.email) AND r.checked_in_at IS NOT NULL) AS attended
         FROM people p WHERE kind=$1
         AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%' OR social_profile ILIKE '%' || $2 || '%' OR furbaby_name ILIKE '%' || $2 || '%')
         AND ($3 = '' OR membership = $3)
       ORDER BY (status = 'New') DESC, created_at DESC LIMIT 300`,
      [kind, q, filter],
    ),
    sql(
      `SELECT count(*) FILTER (WHERE membership = 'active')::int AS active,
              count(*) FILTER (WHERE membership = 'applicant')::int AS applicants,
              count(*) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila')::int AS this_month,
              count(*) FILTER (WHERE status = 'New' AND created_at < now() - interval '7 days')::int AS waiting
         FROM people WHERE kind = $1`,
      [kind],
    ),
  ]);
  const count = (k) => counts.find((row) => row.kind === k)?.count || 0;
  const canEdit = can(admin.roles, "people:edit");
  const members = kind === "Member";
  const link = (extra) => `${base}/people?${new URLSearchParams({ kind, ...(q ? { q } : {}), ...extra })}`;

  return (
    <>
      <PageHead title="People" lead="Everyone who used the Join form, one record each. Open someone for their photo, events and history.">
        {canEdit && <a className="btn ghost" href={`${base}/people/import`}>Import from sheet</a>}
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
          {filter && <input type="hidden" name="m" value={filter} />}
          <label className="visually-hidden" htmlFor="people-q">Search</label>
          <input id="people-q" type="search" name="q" defaultValue={q} placeholder="Search name, email, handle or furbaby" style={{ width: 280 }} />
        </form>
      </div>

      <dl className="people-stats">
        {members && <div><dt>Active members</dt><dd>{stats.active}</dd></div>}
        {members && <div><dt>Applicants</dt><dd>{stats.applicants}</dd></div>}
        <div><dt>New this month</dt><dd>{stats.this_month}</dd></div>
        <div className={stats.waiting ? "is-warn" : undefined}><dt>Waiting over 7 days</dt><dd>{stats.waiting}</dd></div>
      </dl>

      {members && (
        <nav className="tabs small-tabs" aria-label="Membership">
          <a href={link({})} aria-current={!filter ? "page" : undefined}>All</a>
          {MEMBERSHIP.map(([k, label]) => <a key={k} href={link({ m: k })} aria-current={filter === k ? "page" : undefined}>{label}</a>)}
        </nav>
      )}
      <p className="small muted">{HELP[kind]}</p>
      <div className="table-wrap">
        <table className="people-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Contact</th>
              <th>{members || kind === "Volunteer" ? "Furbaby" : "Organization"}</th>
              {members && <th>Membership</th>}
              <th>Joined</th>
              <th>Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={members ? 6 : 5} className="empty">{q || filter ? "No one matches." : "Nobody here yet."}</td></tr>}
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <a className="person-cell" href={`${base}/people/${p.id}`}>
                    <PersonAvatar person={p} base={base} />
                    <span>
                      <strong>{p.name}</strong>
                      {p.joined_count > 1 && <span className="chip" title="Sent the Join form more than once">Joined {p.joined_count}×</span>}
                      {p.attended > 0 && <span className="small muted"> · {p.attended} event{p.attended === 1 ? "" : "s"}</span>}
                    </span>
                  </a>
                </td>
                <td>
                  <a href={`mailto:${p.email}`}>{p.email}</a>
                  {p.social_profile && <><br />{p.social_url ? <a href={p.social_url} target="_blank" rel="noreferrer">{p.social_profile}</a> : p.social_profile}</>}
                </td>
                <td>{(members || kind === "Volunteer" ? p.furbaby_name : p.organization) || "—"}</td>
                {members && (
                  <td>
                    <span className={`chip membership-${p.membership}`}>{membershipLabel(p.membership) || "—"}</span>
                    {p.member_no && <><br /><span className="small muted">{memberNumber(p)}</span></>}
                  </td>
                )}
                <td>{formatWhen(p.created_at)}</td>
                <td>
                  {canEdit ? (
                    <form action={updatePerson} className="person-quick">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="kind" value={kind} />
                      <input type="hidden" name="notes" value={p.notes || ""} />
                      <label className="visually-hidden" htmlFor={`st-${p.id}`}>Follow-up for {p.name}</label>
                      <select id={`st-${p.id}`} name="status" defaultValue={p.status}>
                        {STATUSES[kind].map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button className="btn small ghost">Save</button>
                    </form>
                  ) : (
                    <span className={`chip ${p.status === "New" ? "warn" : ""}`}>{p.status}</span>
                  )}
                  {p.notes && <p className="small muted person-note" title={p.notes}>{p.notes}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
