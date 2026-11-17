import { sql } from "../../lib/db";
import { adminBase, pageAdmin } from "../../lib/admin/guard";
import { redirect } from "next/navigation";
import { PAGES, can } from "../../lib/admin/roles.mjs";
import { METHODS } from "../../lib/admin/payments.mjs";
import { actionLabel } from "../../lib/admin/activity.mjs";
import { CAPACITY_USED_AGGREGATE_SQL } from "../../lib/eventCapacity.mjs";
import { DateBox, Flash, NotAllowed, PageHead, formatDay, formatWhen, manilaToday } from "./ui";
import { displayName } from "../../lib/admin/profile.mjs";
import { staleCounts } from "../../lib/mediaReach.mjs";
import { loadInstagramCounts } from "../../lib/instagramCounts";

export default async function Dashboard({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("dashboard:view");
  const base = await adminBase();
  if (!allowed) {
    // Without the Dashboard, land on the first page they can use.
    const first = PAGES.find((p) => p.path !== "/" && can(admin, p.view[0]));
    if (first) redirect(`${base}${first.path}`);
    return <NotAllowed />;
  }

  const today = manilaToday();
  // Monthly reminder: follower counts typed in Admin → Media hub that are over a month old.
  const staleReach = can(admin, "media:edit")
    ? await Promise.all([sql("SELECT content FROM media_hub_documents WHERE id=true").catch(() => []), loadInstagramCounts()])
      .then(([[doc], instagram]) => staleCounts(doc?.content || {}, { instagram }))
    : [];
  const [pending, newPeople, upcoming, waitlists, log] = await Promise.all([
    can(admin, "payments:view")
      ? sql("SELECT id, method_key, requested_by, requested_at FROM payment_change_requests WHERE status='pending' ORDER BY requested_at")
      : [],
    can(admin, "people:view")
      ? sql("SELECT kind, count(*)::int AS count FROM people WHERE status='New' GROUP BY kind")
      : [],
    sql(
      `SELECT e.id, e.title, e.date, e.venue, e.city, e.status, e.registration, e.capacity,
         count(r.*) FILTER (WHERE r.status='confirmed' AND r.deleted_at IS NULL)::int AS confirmed,
         ${CAPACITY_USED_AGGREGATE_SQL} AS capacity_used,
         count(r.*) FILTER (WHERE r.status='waitlist' AND r.deleted_at IS NULL)::int AS waitlist
       FROM events e LEFT JOIN registrations r ON r.event_id = e.id
       WHERE e.date >= $1 AND e.status <> 'cancelled' GROUP BY e.id ORDER BY e.date LIMIT 5`,
      [today],
    ),
    can(admin, "registrations:view")
      ? sql(
          `SELECT e.id, e.title, count(*)::int AS count FROM registrations r JOIN events e ON e.id=r.event_id
           WHERE r.status='waitlist' AND r.deleted_at IS NULL AND e.date >= $1 GROUP BY e.id ORDER BY e.date`,
          [today],
        )
      : [],
    can(admin, "log:view")
      ? sql(
          `SELECT l.at, l.actor_email, l.action, l.target, a.name, a.first_name, a.furbaby_name, a.show_as, a.email
           FROM activity_log l LEFT JOIN admins a ON lower(a.email) = lower(l.actor_email)
           ORDER BY l.at DESC LIMIT 6`,
        ).catch(() => sql("SELECT at, actor_email, action, target FROM activity_log ORDER BY at DESC LIMIT 6"))
      : [],
  ]);

  const newTotal = newPeople.reduce((sum, row) => sum + row.count, 0);
  const next = upcoming.find((event) => event.status === "published");
  const waitingTotal = waitlists.reduce((s, r) => s + r.count, 0);
  // "4 members · 1 partner": People kinds are singular nouns.
  const kindCount = (row) => `${row.count} ${row.kind.toLowerCase()}${row.count === 1 ? "" : "s"}`;
  const regLine = (event) => event.registration === "required"
    ? `${event.capacity ? `${event.capacity_used} / ${event.capacity} capacity used` : `${event.confirmed} confirmed`}${event.waitlist ? ` · ${event.waitlist} waiting` : ""}`
    : "No registration";
  const who = (row) => displayName({ ...row, email: row.email || row.actor_email });

  return (
    <>
      <PageHead title="Dashboard" lead="What needs you today, then what’s coming up.">
        {can(admin, "events:edit") && <a className="btn gold" href={`${base}/events/new`}>Create event</a>}
      </PageHead>
      <Flash params={params} />

      {pending.map((request) => (
        <div key={request.id} className="banner alert">
          <div>
            <strong>{METHODS[request.method_key].label} change is waiting for a second Owner</strong>
            <p className="small">Requested by {request.requested_by} · {formatWhen(request.requested_at)}. The site keeps the current details until it&apos;s approved.</p>
          </div>
          {request.requested_by === admin.email || !admin.roles.includes("owner")
            ? <span className="small muted">Waiting for a different Owner</span>
            : <a className="btn" href={`${base}/payments/review/${request.id}`}>Review change</a>}
        </div>
      ))}

      {/* At a glance (design review, 17 Nov 2026): each tile opens what it counts; the next event is a short
          title + date, not a 36 px headline, so the four tiles stay the same height. */}
      <section className="grid-4 dash-stats" aria-label="At a glance">
        <StatTile href={can(admin, "people:view") ? `${base}/people` : null} label="New sign-ups to contact" value={newTotal}
          note={newPeople.map(kindCount).join(" · ") || "All caught up"} />
        <StatTile href={next ? `${base}/events/${next.id}` : null} label="Next published event" title={next ? next.title : "—"}
          note={next ? `${formatDay(next.date)} · ${next.venue || "Venue to confirm"}` : "Nothing published yet"} />
        <StatTile href={waitlists.length === 1 ? `${base}/registrations/${waitlists[0].id}` : null} label="On a waitlist" value={waitingTotal}
          note={waitlists.length === 1 ? waitlists[0].title : waitlists.length ? waitlists.map((r) => `${r.count} for ${r.title}`).join(" · ") : "No waitlists"} />
        <StatTile href={can(admin, "payments:view") ? `${base}/payments` : null} label="Payment changes waiting" value={pending.length}
          note={pending.length ? "Need a second Owner to approve" : "Nothing to approve"} />
      </section>

      <div className="cols">
        <section className="card" aria-labelledby="needs-you">
          <div><h2 id="needs-you">Needs you</h2><p className="small muted">Each item opens the record it is about.</p></div>
          {newPeople.length === 0 && waitlists.length === 0 && pending.length === 0 && staleReach.length === 0 && <p className="muted">Nothing waiting. Nice.</p>}
          {staleReach.length > 0 && (
            <div className="task">
              <div><strong>Update follower counts on the media hub</strong><span className="small muted">Over a month old: {staleReach.map((row) => row.what).join(", ")}. Check their Instagram profiles, then update the numbers and dates.</span></div>
              <span className="task-actions"><span className="chip warn">Monthly</span>
              <a className="btn ghost small" href={`${base}/media`}>Open Media hub</a></span>
            </div>
          )}
          {newPeople.map((row) => (
            <div className="task" key={row.kind}>
              <div><strong>{row.count} new {row.kind.toLowerCase()}{row.count === 1 ? "" : "s"}</strong><span className="small muted">Follow up, then set their status.</span></div>
              <span className="task-actions"><span className="chip warn">New</span>
              <a className="btn ghost small" href={`${base}/people?kind=${row.kind}`}>Open {row.kind.toLowerCase()}{row.count === 1 ? "" : "s"}</a></span>
            </div>
          ))}
          {waitlists.map((row) => (
            <div className="task" key={row.id}>
              <div><strong>{row.title} waitlist</strong><span className="small muted">{row.count} waiting · offer a slot if someone cancels</span></div>
              <span className="task-actions"><span className="chip">Waitlist</span>
              <a className="btn ghost small" href={`${base}/registrations/${row.id}`}>Open RSVPs</a></span>
            </div>
          ))}
        </section>

        <section className="card" aria-labelledby="coming-up">
          <div><h2 id="coming-up">Coming up</h2><p className="small muted">Soonest first, drafts included.</p></div>
          {upcoming.length === 0 && <p className="muted">No upcoming events yet.</p>}
          {upcoming.map((event) => (
            <div className="task" key={event.id}>
              <DateBox date={event.date} />
              <div>
                <a className="task-link" href={`${base}/events/${event.id}`}><strong>{event.title}</strong></a>
                <span className="small muted"><span className="sr-only">{formatDay(event.date)} · </span>{regLine(event)}</span>
              </div>
              <span className={`chip ${event.status === "published" ? "good" : ""}`}>{event.status === "published" ? "Published" : "Draft"}</span>
            </div>
          ))}
        </section>
      </div>

      {log.length > 0 && (
        <section className="card" aria-labelledby="recent">
          <div className="card-head-row">
            <div><h2 id="recent">Recent activity</h2><p className="small muted">The latest changes by the team.</p></div>
            <a className="btn ghost small" href={`${base}/admins#activity-log`}>See the full log</a>
          </div>
          <div className="table-wrap">
            <table className="stack-table dash-log">
              <thead><tr><th>When</th><th>Who</th><th>What</th><th>About</th></tr></thead>
              <tbody>
                {log.map((row, i) => (
                  <tr key={i}>
                    <td className="st-3 dash-when">{formatWhen(row.at)}</td>
                    <td className="st-2" title={row.actor_email}>{who(row)}</td>
                    <td className="st-1"><strong className="dash-what">{actionLabel(row.action)}</strong></td>
                    <td className={`st-4${row.target ? "" : " dash-empty"}`}>{row.target || <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

/** One "At a glance" tile: a big number, or a short title for the next event; a link when there is a page to open. */
function StatTile({ href, label, value, title, note }) {
  const body = (
    <>
      <span className="label">{label}</span>
      {title !== undefined ? <span className="value value-title">{title}</span> : <span className="value">{value}</span>}
      <span className="small muted stat-note">{note}</span>
    </>
  );
  return href ? <a className="stat" href={href}>{body}</a> : <div className="stat">{body}</div>;
}
