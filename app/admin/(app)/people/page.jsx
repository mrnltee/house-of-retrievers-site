import FurbabyList from "../registrations/FurbabyList";
import HowTo from "../HowTo";
import { PAGE_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { updatePerson } from "../../actions";
import { MEMBERSHIP, PEOPLE_KINDS, PEOPLE_STATUSES, hasMembership, memberNumber, membershipLabel } from "../../../lib/admin/people.mjs";
import { Flash, NotAllowed, PageHead, formatDay } from "../ui";
import ListSearch from "../ListSearch";
import StatusSelect from "./StatusSelect";
import { RegSelectAll, RegSelectionBar } from "../registrations/[eventId]/RegTools";
import PersonAvatar from "./PersonAvatar";
import ConfirmButton from "../ConfirmButton";
import { agesToday } from "../../../lib/furbabyAge.mjs";

const KINDS = PEOPLE_KINDS;
const STATUSES = PEOPLE_STATUSES;
const HELP = {
  Member: "Contact them and add them to the group chat. Open someone to confirm their membership and send the welcome email.",
  Volunteer: "Under 18s volunteer only with a parent or guardian. Check before marking Onboarded. Open someone to make them Active: they get a volunteer number (HORV-YY-NNNN) and, if you like, a welcome email.",
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
  const noPhoto = params?.photo === "none";
  // Tiles open what they count (design review, 17 Nov 2026): waiting over 7 days, new this month.
  const waitingOnly = params?.waiting === "1";
  const monthOnly = params?.since === "month";
  const [counts, rows, [stats]] = await Promise.all([
    sql("SELECT kind, count(*)::int AS count FROM people GROUP BY kind"),
    sql(
      `SELECT p.*, (SELECT count(*)::int FROM registrations r WHERE lower(r.email) = lower(p.email) AND r.deleted_at IS NULL AND r.checked_in_at IS NOT NULL) AS attended
         FROM people p WHERE kind=$1
         AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%' OR social_profile ILIKE '%' || $2 || '%' OR furbaby_name ILIKE '%' || $2 || '%')
         AND ($3 = '' OR membership = $3)
         AND (NOT $4 OR photo_id IS NULL)
         AND (NOT $5 OR (status = 'New' AND created_at < now() - interval '7 days'))
         AND (NOT $6 OR created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila')
       ORDER BY (status = 'New') DESC, created_at DESC LIMIT 300`,
      [kind, q, filter, noPhoto, waitingOnly, monthOnly],
    ),
    sql(
      `SELECT count(*) FILTER (WHERE membership = 'active')::int AS active,
              count(*) FILTER (WHERE membership = 'applicant')::int AS applicants,
              count(*) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila')::int AS this_month,
              count(*) FILTER (WHERE status = 'New' AND created_at < now() - interval '7 days')::int AS waiting,
              count(*) FILTER (WHERE photo_id IS NULL)::int AS no_photo
         FROM people WHERE kind = $1`,
      [kind],
    ),
  ]);
  const count = (k) => counts.find((row) => row.kind === k)?.count || 0;
  const canEdit = can(admin, "people:edit");
  const members = hasMembership(kind);
  const link = (extra) => `${base}/people?${new URLSearchParams({ kind, ...(q ? { q } : {}), ...(noPhoto ? { photo: "none" } : {}), ...extra })}`;
  const tileHref = (extra) => `${base}/people?${new URLSearchParams({ kind, ...extra })}`;
  const canSend = can(admin, "letters:edit");
  const findOf = (p) => [p.name, p.email, p.social_profile, p.furbaby_name, p.organization, p.status, membershipLabel(p.membership), memberNumber(p)].filter(Boolean).join(" ").toLowerCase();

  return (
    <>
      <PageHead title="People" lead="Everyone who used the Join form, one record each. Open someone for their photo, events and history."><HowTo guide={PAGE_GUIDES.people[0]} guides={PAGE_GUIDES.people} className="btn ghost" />
        {canEdit && <a className="btn ghost" href={`${base}/people/import`}>Import</a>}
        <a className="btn ghost" href={`${base}/people/export?kind=${kind}`}>Export CSV</a>
      </PageHead>
      <Flash params={params} />
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <nav className="tabs" aria-label="Kind">
          {KINDS.map((k) => (
            <a key={k} href={`${base}/people?kind=${k}`} aria-current={kind === k ? "page" : undefined}>{k}s · {count(k)}</a>
          ))}
        </nav>
      </div>

      <ListSearch q={q} action={`${base}/people`} hidden={{ kind, m: filter }} placeholder="Find someone by name, email, handle, furbaby or number…" />
      <div className="people-stats">
        {members && <a href={tileHref({ m: "active" })}><span className="ps-label">Active {kind === "Volunteer" ? "volunteers" : "members"}</span><span className="ps-value">{stats.active}</span></a>}
        {members && <a href={tileHref({ m: "applicant" })}><span className="ps-label">Applicants</span><span className="ps-value">{stats.applicants}</span></a>}
        <a href={tileHref({ since: "month" })} aria-current={monthOnly ? "page" : undefined}><span className="ps-label">New this month</span><span className="ps-value">{stats.this_month}</span></a>
        <a href={tileHref({ waiting: "1" })} className={stats.waiting ? "is-warn" : undefined} aria-current={waitingOnly ? "page" : undefined}><span className="ps-label">Waiting over 7 days</span><span className="ps-value">{stats.waiting}</span></a>
      </div>

      {(members || stats.no_photo > 0 || noPhoto) && (
        <nav className="tabs small-tabs" aria-label="Show">
          {members && <a href={link({})} aria-current={!filter && !noPhoto ? "page" : undefined}>All</a>}
          {members && MEMBERSHIP.map(([k, label]) => <a key={k} href={link({ m: k })} aria-current={filter === k && !noPhoto ? "page" : undefined}>{label}</a>)}
          {(stats.no_photo > 0 || noPhoto) && (noPhoto
            ? <a className="tab-aside" aria-current="page" href={`${base}/people?${new URLSearchParams({ kind, ...(q ? { q } : {}), ...(filter ? { m: filter } : {}) })}`}>No photo yet · {stats.no_photo} <span className="visually-hidden">(showing; press to show everyone)</span></a>
            : <a className="tab-aside" href={link({ ...(filter ? { m: filter } : {}), photo: "none" })}>No photo yet · {stats.no_photo}</a>)}
        </nav>
      )}
      {(waitingOnly || monthOnly) && <p className="small">{waitingOnly ? "Showing people still on New after 7 days." : "Showing people who joined this month."} <a href={tileHref({})}>Show everyone</a></p>}
      <p className="small muted">{HELP[kind]}</p>
      {canSend && rows.length > 0 && (
        <RegSelectionBar hint="Tick people to email several at once." refPrefix="person:" messageLabel="Email them"
          messageBase={`${base}/letters/send?${new URLSearchParams([["letter", "guest-follow-up"], ["own", "1"]]).toString()}`} />
      )}
      <div className="table-wrap">
        <table className="people-table stack-table">
          <thead>
            <tr>
              {canSend && <th className="st-pick">{rows.length > 0 ? <RegSelectAll /> : <span className="sr-only">Pick</span>}</th>}
              <th>Person</th>
              <th>Contact</th>
              <th>{members ? "Furbaby" : "Organization"}</th>
              {members && <th>{kind === "Volunteer" ? "Status" : "Membership"}</th>}
              <th>Joined</th>
              <th>Follow-up</th>
            </tr>
          </thead>
          <tbody id="reg-rows">
            {rows.length === 0 && <tr><td colSpan={(members ? 6 : 5) + (canSend ? 1 : 0)} className="empty">{q || filter || noPhoto ? "No one matches." : "Nobody here yet."}</td></tr>}
            {rows.map((p) => (
              <tr key={p.id} data-row="" data-find={findOf(p)}>
                {canSend && <td className="st-pick"><input type="checkbox" name="reg" value={p.id} data-reg-pick="" aria-label={`Pick ${p.name}`} /></td>}
                <td className="st-1">
                  <a className="person-cell" href={`${base}/people/${p.id}`}>
                    <PersonAvatar person={p} base={base} />
                    <span>
                      <strong>{p.name}</strong>
                      {p.joined_count > 1 && <span className="chip" title="Sent the Join form more than once">Joined {p.joined_count}×</span>}
                      {p.attended > 0 && <><br /><span className="small muted">Came to {p.attended} event{p.attended === 1 ? "" : "s"}</span></>}
                    </span>
                  </a>
                </td>
                <td className="st-4" data-label="Contact">
                  <a href={`mailto:${p.email}`}>{p.email}</a>
                  {p.social_profile && <><br />{p.social_url ? <a href={p.social_url} target="_blank" rel="noreferrer">{p.social_profile}</a> : p.social_profile}</>}
                </td>
                <td className="st-3" data-label={members ? "Furbaby" : "Organization"}>{members ? <FurbabyList names={p.furbaby_name} breeds={p.furbaby_breeds} rainbow={p.furbaby_rainbow} sexes={p.furbaby_sexes} ages={agesToday(p.furbaby_ages, p.furbaby_ages_on, { rainbow: p.furbaby_rainbow || [] })} /> : p.organization || "—"}</td>
                {members && (
                  <td className="st-2">
                    <span className={`chip membership-${p.membership}`}>{membershipLabel(p.membership) || "—"}</span>
                    {p.member_no && <><br /><span className="small muted">{memberNumber(p)}</span></>}
                  </td>
                )}
                <td className="st-5" data-label="Joined">{formatDay(new Date(p.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }))}</td>
                <td className="st-6" data-label="Follow-up">
                  {canEdit ? (
                    <form action={updatePerson} className="person-quick">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="kind" value={kind} />
                      <input type="hidden" name="notes" value={p.notes || ""} />
                      <StatusSelect id={`st-${p.id}`} name={p.name} value={p.status} options={STATUSES[kind]}>
                      <ConfirmButton
                        className="btn small ghost"
                        title={`Save ${p.name}'s follow-up status?`}
                        echo={[{ name: "status", label: "Status" }]}
                        items={["Their People record is updated", "The activity log records the change"]}
                        yes="Yes, save status"
                        tone="ghost"
                      >Save</ConfirmButton>
                      </StatusSelect>
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
