import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { Flash, NotAllowed, PageHead, formatDay, manilaToday } from "../ui";

const TABS = [["upcoming", "Upcoming"], ["drafts", "Drafts"], ["past", "Past"]];

export default async function EventsPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("events:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const tab = TABS.some(([key]) => key === params?.tab) ? params.tab : "upcoming";
  const today = manilaToday();
  const where = {
    upcoming: "e.date >= $1 AND e.status <> 'draft'",
    drafts: "e.status = 'draft' AND $1::date IS NOT NULL",
    past: "e.date < $1 AND e.status <> 'draft'",
  }[tab];
  const rows = await sql(
    `SELECT e.id, e.title, e.date, e.status, e.registration, e.capacity, e.cost,
       count(r.*) FILTER (WHERE r.status='confirmed')::int AS confirmed
     FROM events e LEFT JOIN registrations r ON r.event_id = e.id
     WHERE ${where} GROUP BY e.id ORDER BY e.date ${tab === "past" ? "DESC" : "ASC"}`,
    [today],
  );
  const canEdit = can(admin.roles, "events:edit");

  return (
    <>
      <PageHead title="Events" lead="Drafts stay private. An event goes public only once every fact the page shows is filled in.">
        {canEdit && <a className="btn gold" href={`${base}/events/new`}>Create event</a>}
      </PageHead>
      <Flash params={params} />
      <nav className="tabs" aria-label="Which events">
        {TABS.map(([key, label]) => (
          <a key={key} href={`${base}/events?tab=${key}`} aria-current={tab === key ? "page" : undefined}>{label}</a>
        ))}
      </nav>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Event</th><th>Registration</th><th>RSVPs</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="empty">No events here yet.</td></tr>}
            {rows.map((event) => (
              <tr key={event.id}>
                <td>{formatDay(event.date)}</td>
                <td className="strong">{event.title}</td>
                <td>{event.registration === "required" ? `Required${event.cost ? ` · ${event.cost}` : ""}` : "None needed"}</td>
                <td>{event.registration === "required" ? `${event.confirmed}${event.capacity ? ` / ${event.capacity}` : ""}` : "—"}</td>
                <td><span className={`chip ${event.status === "published" ? "good" : event.status === "cancelled" ? "alert" : ""}`}>{event.status[0].toUpperCase() + event.status.slice(1)}</span></td>
                <td className="actions">
                  {canEdit && <a className="linkish" href={`${base}/events/${event.id}`}>Edit</a>}
                  {event.registration === "required" && can(admin.roles, "registrations:view") && <a className="linkish" href={`${base}/registrations/${event.id}`}>RSVPs</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
