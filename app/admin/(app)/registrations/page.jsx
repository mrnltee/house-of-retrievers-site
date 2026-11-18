import { sql } from "../../../lib/db";
import HowTo from "../HowTo";
import { PAGE_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import { CAPACITY_USED_AGGREGATE_SQL } from "../../../lib/eventCapacity.mjs";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { participantsLabel } from "../../../lib/eventCategories.mjs";
import { NotAllowed, PageHead, formatDay, manilaToday } from "../ui";

/**
 * Registrations index (design review, 17 Nov 2026): one row per event that takes RSVPs, laid out like the Events
 * list (poster, title, date), with what needs doing on it: payments to check, holds that ran out, the waitlist.
 * Upcoming events first; the last month's events under "Recent", with how many checked in.
 */
export default async function RegistrationsIndex() {
  const { allowed } = await pageAdmin("registrations:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const today = manilaToday();
  const rows = await sql(
    `SELECT e.id, e.title, e.date, e.capacity, e.status, e.category, e.image, e.fee_required,
       count(r.*) FILTER (WHERE r.status='confirmed' AND r.deleted_at IS NULL)::int AS confirmed,
       ${CAPACITY_USED_AGGREGATE_SQL} AS capacity_used,
       count(r.*) FILTER (WHERE r.status='waitlist' AND r.deleted_at IS NULL)::int AS waitlist,
       count(r.*) FILTER (WHERE r.deleted_at IS NULL AND r.status='confirmed' AND r.fee_status='review')::int AS to_check,
       count(r.*) FILTER (WHERE r.deleted_at IS NULL AND r.status='confirmed' AND r.fee_status='waiting'
         AND r.hold_expires_at IS NOT NULL AND r.hold_expires_at <= now())::int AS expired,
       count(r.*) FILTER (WHERE r.deleted_at IS NULL AND r.checked_in_at IS NOT NULL)::int AS checked_in
     FROM events e LEFT JOIN registrations r ON r.event_id = e.id
     WHERE e.registration = 'required' AND e.date >= ($1::date - 30)
     GROUP BY e.id ORDER BY e.date`,
    [today],
  );
  const upcoming = rows.filter((e) => formatIso(e.date) >= today);
  const recent = rows.filter((e) => !upcoming.includes(e)).reverse();

  return (
    <>
      <PageHead title="Registrations" lead="Who's coming to each event that takes RSVPs, and what still needs checking." ><HowTo guide={PAGE_GUIDES.registrations[0]} guides={PAGE_GUIDES.registrations} className="btn ghost" /></PageHead>
      {rows.length === 0 && (
        <section className="card"><p className="muted">No events take RSVPs yet. Turn on Registration in an event’s editor and it will show here.</p></section>
      )}
      {upcoming.length > 0 && <RegTable base={base} rows={upcoming} title={recent.length ? "Upcoming" : null} />}
      {recent.length > 0 && <RegTable base={base} rows={recent} past title="Recent" lead="Events in the last month." />}
    </>
  );
}

const formatIso = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10));

function RegTable({ base, rows, past = false, title, lead }) {
  const id = title ? `reg-${title.toLowerCase()}` : undefined;
  return (
    <section className="reg-index" aria-labelledby={id} aria-label={id ? undefined : "Events taking RSVPs"}>
      {title && <div className="reg-index-head"><h2 id={id}>{title}</h2>{lead && <p className="small muted">{lead}</p>}</div>}
      <div className="table-wrap">
        <table className="stack-table admin-events">
          <thead><tr><th>Event</th><th>Date</th><th>Signed up</th><th>{past ? "Checked in" : "Needs you"}</th><th><span className="sr-only">Open</span></th></tr></thead>
          <tbody>
            {rows.map((event) => {
              const href = `${base}/registrations/${event.id}`;
              const share = event.capacity ? Math.min(100, Math.round((event.capacity_used / event.capacity) * 100)) : null;
              const flags = [
                event.to_check ? { text: `${event.to_check} payment${event.to_check === 1 ? "" : "s"} to check`, tone: "warn" } : null,
                event.expired ? { text: `${event.expired} hold${event.expired === 1 ? "" : "s"} expired`, tone: "alert" } : null,
                event.waitlist ? { text: `${event.waitlist} on the waitlist`, tone: "" } : null,
              ].filter(Boolean);
              return (
                <tr key={event.id}>
                  <td className="st-1">
                    <div className="ev-row">
                      {event.image ? <img className="ev-thumb" src={event.image} alt="" loading="lazy" /> : <span className="ev-thumb ev-thumb-empty" aria-hidden="true" />}
                      <div>
                        <a className="ev-title" href={href}>{event.title}</a>
                        {event.status !== "published" && <span className="small muted ev-meta">{event.status === "draft" ? "Draft · not public yet" : "Cancelled"}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="st-2 ev-when" data-label="Date">{formatDay(event.date)}</td>
                  <td className="st-3" data-label="Signed up">
                    {event.capacity
                      ? <>{event.capacity_used} <span className="muted">/ {event.capacity}</span>
                          <span className="reg-meter" role="img" aria-label={`${share}% of capacity used`}><span style={{ width: `${share}%` }} /></span></>
                      : <>{event.confirmed} <span className="muted">confirmed</span></>}
                  </td>
                  <td className="st-4" data-label={past ? "Checked in" : "Needs you"}>
                    {past
                      ? <>{event.checked_in} <span className="muted">of {event.confirmed}</span></>
                      : flags.length
                        ? <span className="reg-flags">{flags.map((f) => <span key={f.text} className={`chip ${f.tone}`}>{f.text}</span>)}</span>
                        : <span className="muted">Nothing waiting</span>}
                  </td>
                  <td className="st-6">
                    <div className="actions ev-actions">
                      <a className="btn ghost small" href={href} aria-label={`Open ${participantsLabel(event.category)} for ${event.title}`}>Open {participantsLabel(event.category)}</a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
