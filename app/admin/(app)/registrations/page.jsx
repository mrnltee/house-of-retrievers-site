import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { DateBox, NotAllowed, PageHead, manilaToday } from "../ui";

export default async function RegistrationsIndex() {
  const { allowed } = await pageAdmin("registrations:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const rows = await sql(
    `SELECT e.id, e.title, e.date, e.capacity, e.status,
       count(r.*) FILTER (WHERE r.status='confirmed')::int AS confirmed,
       count(r.*) FILTER (WHERE r.status='waitlist')::int AS waitlist
     FROM events e LEFT JOIN registrations r ON r.event_id = e.id
     WHERE e.registration = 'required' AND e.date >= ($1::date - 30)
     GROUP BY e.id ORDER BY e.date`,
    [manilaToday()],
  );
  return (
    <>
      <PageHead title="Registrations" lead="Events that take RSVPs, from the last month onwards." />
      <section className="card">
        {rows.length === 0 && <p className="muted">No events take RSVPs yet. Set Registration to “Yes” on an event.</p>}
        {rows.map((event) => (
          <div className="task" key={event.id}>
            <DateBox date={event.date} />
            <div>
              <strong>{event.title}</strong>
              <span className="small muted">{event.confirmed}{event.capacity ? ` / ${event.capacity}` : ""} confirmed{event.waitlist ? ` · ${event.waitlist} waiting` : ""}</span>
            </div>
            <a className="btn ghost small" href={`${base}/registrations/${event.id}`}>Open</a>
          </div>
        ))}
      </section>
    </>
  );
}
