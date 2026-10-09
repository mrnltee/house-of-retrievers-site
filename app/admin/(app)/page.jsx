import { sql } from "../../lib/db";
import { adminBase, pageAdmin } from "../../lib/admin/guard";
import { can } from "../../lib/admin/roles.mjs";
import { METHODS } from "../../lib/admin/payments.mjs";
import { actionLabel } from "../../lib/admin/activity.mjs";
import { DateBox, Flash, NotAllowed, PageHead, formatWhen, manilaToday } from "./ui";

export default async function Dashboard({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("dashboard:view");
  const base = await adminBase();
  if (!allowed) {
    // Check-in helpers land on their one screen.
    if (can(admin.roles, "checkin")) {
      return (
        <>
          <PageHead title="Check-in" lead="Your role covers event-day check-in." />
          <p><a className="btn gold" href={`${base}/checkin`}>Open check-in</a></p>
        </>
      );
    }
    return <NotAllowed />;
  }

  const today = manilaToday();
  const [pending, newPeople, upcoming, waitlists, log] = await Promise.all([
    can(admin.roles, "payments:view")
      ? sql("SELECT id, method_key, requested_by, requested_at FROM payment_change_requests WHERE status='pending' ORDER BY requested_at")
      : [],
    can(admin.roles, "people:view")
      ? sql("SELECT kind, count(*)::int AS count FROM people WHERE status='New' GROUP BY kind")
      : [],
    sql(
      `SELECT e.id, e.title, e.date, e.venue, e.city, e.status, e.registration, e.capacity,
         count(r.*) FILTER (WHERE r.status='confirmed')::int AS confirmed,
         count(r.*) FILTER (WHERE r.status='waitlist')::int AS waitlist
       FROM events e LEFT JOIN registrations r ON r.event_id = e.id
       WHERE e.date >= $1 AND e.status <> 'cancelled' GROUP BY e.id ORDER BY e.date LIMIT 5`,
      [today],
    ),
    can(admin.roles, "registrations:view")
      ? sql(
          `SELECT e.id, e.title, count(*)::int AS count FROM registrations r JOIN events e ON e.id=r.event_id
           WHERE r.status='waitlist' AND e.date >= $1 GROUP BY e.id ORDER BY e.date`,
          [today],
        )
      : [],
    can(admin.roles, "log:view") ? sql("SELECT at, actor_email, action, target FROM activity_log ORDER BY at DESC LIMIT 6") : [],
  ]);

  const newTotal = newPeople.reduce((sum, row) => sum + row.count, 0);
  const next = upcoming.find((event) => event.status === "published");

  return (
    <>
      <PageHead title="Dashboard" lead="What needs a person today, then what is coming up.">
        {can(admin.roles, "events:edit") && <a className="btn gold" href={`${base}/events/new`}>Create event</a>}
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

      <section className="grid-4" aria-label="At a glance">
        <div className="stat"><span className="label">New sign-ups to contact</span><span className="value">{newTotal}</span><span className="small muted">{newPeople.map((r) => `${r.count} ${r.kind.toLowerCase()}`).join(" · ") || "All caught up"}</span></div>
        <div className="stat"><span className="label">Next published event</span><span className="value">{next ? next.title : "—"}</span><span className="small muted">{next ? `${next.venue || "Venue to confirm"}` : "Nothing published yet"}</span></div>
        <div className="stat"><span className="label">On a waitlist</span><span className="value">{waitlists.reduce((s, r) => s + r.count, 0)}</span><span className="small muted">{waitlists.map((r) => r.title).join(" · ") || "No waitlists"}</span></div>
        <div className="stat"><span className="label">Payment changes waiting</span><span className="value">{pending.length}</span><span className="small muted">Need a second Owner</span></div>
      </section>

      <div className="cols">
        <section className="card" aria-labelledby="needs-you">
          <div><h2 id="needs-you">Needs you</h2><p className="small muted">Each item opens the record it is about.</p></div>
          {newPeople.length === 0 && waitlists.length === 0 && pending.length === 0 && <p className="muted">Nothing waiting. Nice.</p>}
          {newPeople.map((row) => (
            <div className="task" key={row.kind}>
              <div><strong>{row.count} new {row.kind.toLowerCase()}{row.count === 1 ? "" : "s"}</strong><span className="small muted">Follow up, then set their status.</span></div>
              <span className="chip warn">New</span>
              <a className="btn ghost small" href={`${base}/people?kind=${row.kind}`}>Open People</a>
            </div>
          ))}
          {waitlists.map((row) => (
            <div className="task" key={row.id}>
              <div><strong>{row.title} waitlist</strong><span className="small muted">{row.count} waiting · offer a slot if someone cancels</span></div>
              <span className="chip">Waitlist</span>
              <a className="btn ghost small" href={`${base}/registrations/${row.id}`}>Open RSVPs</a>
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
                <strong>{event.title}</strong>
                <span className="small muted">
                  {event.registration === "required" ? `${event.confirmed}${event.capacity ? ` / ${event.capacity}` : ""} confirmed${event.waitlist ? ` · ${event.waitlist} waiting` : ""}` : "No registration"}
                </span>
              </div>
              <span className={`chip ${event.status === "published" ? "good" : ""}`}>{event.status === "published" ? "Published" : "Draft"}</span>
            </div>
          ))}
        </section>
      </div>

      {log.length > 0 && (
        <section className="card" aria-labelledby="recent">
          <div><h2 id="recent">Recent activity</h2><p className="small muted">From the activity log.</p></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Who</th><th>What</th><th>About</th></tr></thead>
              <tbody>
                {log.map((row, i) => (
                  <tr key={i}><td>{formatWhen(row.at)}</td><td>{row.actor_email}</td><td>{actionLabel(row.action)}</td><td>{row.target || "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
