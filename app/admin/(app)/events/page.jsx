import { formatOpens, opensLater } from "../../../lib/rsvpOpens.mjs";
import HowTo from "../HowTo";
import { PAGE_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import { sql } from "../../../lib/db";
import { CAPACITY_USED_AGGREGATE_SQL } from "../../../lib/eventCapacity.mjs";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { participantsLabel } from "../../../lib/eventCategories.mjs";
import { describeRule } from "../../../lib/eventRecurrence.mjs";
import { Flash, NotAllowed, PageHead, formatDay, manilaToday } from "../ui";
import { formatTime } from "../../../lib/share.mjs";

const TABS = [["upcoming", "Upcoming"], ["drafts", "Drafts"], ["past", "Past"]];
const EMPTY = {
  upcoming: "No published events coming up.",
  drafts: "No drafts. New events start here until they're published.",
  past: "No past events yet.",
};

export default async function EventsPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("events:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const tab = TABS.some(([key]) => key === params?.tab) ? params.tab : "upcoming";
  const today = manilaToday();
  const WHERE = {
    upcoming: "e.date >= $1 AND e.status <> 'draft'",
    drafts: "e.status = 'draft' AND $1::date IS NOT NULL",
    past: "e.date < $1 AND e.status <> 'draft'",
  };
  const where = WHERE[tab];
  // Tab counts, so an empty Drafts or Past tab doesn't need a click to find out.
  const [counts] = await sql(
    `SELECT count(*) FILTER (WHERE ${WHERE.upcoming.replaceAll("e.", "")})::int AS upcoming,
       count(*) FILTER (WHERE ${WHERE.drafts.replaceAll("e.", "")})::int AS drafts,
       count(*) FILTER (WHERE ${WHERE.past.replaceAll("e.", "")})::int AS past FROM events`,
    [today],
  );
  const rows = await sql(
    `SELECT e.id, e.title, e.date, e.start_time, e.end_time, e.all_day, e.venue, e.city, e.image, e.status, e.category, e.recurrence, e.registration, e.capacity, e.cost, e.rsvp_opens_at,
       count(r.*) FILTER (WHERE r.status='confirmed' AND r.deleted_at IS NULL)::int AS confirmed,
       ${CAPACITY_USED_AGGREGATE_SQL} AS capacity_used
     FROM events e LEFT JOIN registrations r ON r.event_id = e.id
     WHERE ${where} GROUP BY e.id ORDER BY e.date ${tab === "past" ? "DESC" : "ASC"}`,
    [today],
  );
  const canEdit = can(admin, "events:edit");

  return (
    <>
      <PageHead title="Events" lead="Drafts stay private. An event goes public only once every fact the page shows is filled in."><HowTo guide={PAGE_GUIDES.events[0]} guides={PAGE_GUIDES.events} className="btn ghost" />
        {canEdit && <a className="btn gold" href={`${base}/events/new`}>Create event</a>}
      </PageHead>
      <Flash params={params} />
      <nav className="tabs" aria-label="Which events">
        {TABS.map(([key, label]) => (
          <a key={key} href={`${base}/events?tab=${key}`} aria-current={tab === key ? "page" : undefined}>{label} · {counts?.[key] ?? 0}</a>
        ))}
      </nav>
      {/* Events list review (17 Nov 2026, design review): poster, place and time with each event so rows are
          recognisable at a glance; a card per event on phones (the table used to widen the page). */}
      <div className="table-wrap">
        <table className="stack-table admin-events">
          <thead><tr><th>Event</th><th>When</th><th>Registration</th><th>Signed up</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="empty">
                {EMPTY[tab]}
                {canEdit && tab !== "past" && <> <a href={`${base}/events/new`}>Create an event</a></>}
              </td></tr>
            )}
            {rows.map((event) => {
              const place = [event.venue, event.city].filter(Boolean).join(", ");
              const time = event.all_day ? "All day" : formatTime(String(event.start_time || "").slice(0, 5));
              return (
                <tr key={event.id}>
                  <td className="st-1">
                    <div className="ev-row">
                      {event.image ? <img className="ev-thumb" src={event.image} alt="" loading="lazy" /> : <span className="ev-thumb ev-thumb-empty" aria-hidden="true" />}
                      <div>
                        <a className="ev-title" href={`${base}/events/${event.id}`}>{event.title}</a>
                        <span className="small muted ev-meta">{[event.category, place || "Venue to confirm"].filter(Boolean).join(" · ")}</span>
                        {event.recurrence && <span className="small muted ev-meta">{describeRule(event.recurrence)}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="st-2 ev-when" data-label="When">{formatDay(event.date)}{time && <span className="small muted ev-meta">{time}</span>}</td>
                  <td className="st-3" data-label="Registration">
                    {event.registration === "required" ? `Required${event.cost ? ` · ${event.cost}` : ""}` : "None needed"}
                    {event.registration === "required" && event.rsvp_opens_at && opensLater(new Date(event.rsvp_opens_at).toISOString()) && <span className="small muted ev-meta">Opens {formatOpens(new Date(event.rsvp_opens_at).toISOString())}</span>}
                  </td>
                  <td className="st-4" data-label="Signed up">
                    {event.registration !== "required" ? <span className="muted">—</span>
                      : event.capacity ? <>{event.capacity_used} <span className="muted">/ {event.capacity}</span></>
                      : <>{event.confirmed} <span className="muted">confirmed</span></>}
                  </td>
                  <td className="st-5"><span className={`chip ${event.status === "published" ? "good" : event.status === "cancelled" ? "alert" : ""}`}>{event.status[0].toUpperCase() + event.status.slice(1)}</span></td>
                  <td className="st-6">
                    <div className="actions ev-actions">
                      {canEdit && <a className="btn ghost small" href={`${base}/events/${event.id}`}>Edit</a>}
                      {event.registration === "required" && can(admin, "registrations:view") && <a className="btn ghost small" href={`${base}/registrations/${event.id}`}>{participantsLabel(event.category)}</a>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
