import { sql } from "../../../lib/db";
import HowTo from "../HowTo";
import { PAGE_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { formatTime } from "../../../lib/share.mjs";
import { NotAllowed, PageHead, formatDay, isoDate, manilaToday } from "../ui";

/**
 * Check-in index (design review, 17 Nov 2026): a door volunteer on a phone picks the event. Each event is a card
 * with its poster, when and where, how many have arrived, a 44 px "Start check-in" and the display screen; today's
 * event comes first and is marked, later ones say how far off they are.
 */
export default async function CheckInIndex() {
  const { allowed } = await pageAdmin("checkin:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const today = manilaToday();
  const rows = await sql(
    `SELECT e.id, e.title, e.date, e.start_time, e.all_day, e.venue, e.city, e.image,
       count(r.*) FILTER (WHERE r.status='confirmed' AND r.deleted_at IS NULL)::int AS expected,
       count(r.*) FILTER (WHERE r.status='confirmed' AND r.deleted_at IS NULL AND r.checked_in_at IS NOT NULL)::int AS arrived
     FROM events e LEFT JOIN registrations r ON r.event_id = e.id
     WHERE e.registration='required' AND e.status='published' AND e.date >= ($1::date - 1)
     GROUP BY e.id ORDER BY e.date LIMIT 10`,
    [today],
  );

  return (
    <>
      <PageHead title="Check-in" lead="Pick the event, then scan the QR on each guest's confirmation email." ><HowTo guide={PAGE_GUIDES.checkin[0]} guides={PAGE_GUIDES.checkin} className="btn ghost" /></PageHead>
      {rows.length === 0 && (
        <section className="card">
          <p className="muted">No published events with RSVPs today or coming up. An event shows here once it’s published and takes RSVPs.</p>
          <p><a className="btn ghost small" href={`${base}/events`}>Go to Events</a></p>
        </section>
      )}
      <ul className="ci-list">
        {rows.map((event) => {
          const when = whenLabel(isoDate(event.date), today);
          const time = event.all_day ? "All day" : formatTime(String(event.start_time || "").slice(0, 5));
          const place = [event.venue, event.city].filter(Boolean).join(", ");
          const share = event.expected ? Math.round((event.arrived / event.expected) * 100) : 0;
          return (
            <li key={event.id} className={`ci-card${when.today ? " is-today" : ""}`}>
              {event.image ? <img className="ci-poster" src={event.image} alt="" loading="lazy" /> : <span className="ci-poster ci-poster-empty" aria-hidden="true" />}
              <div className="ci-body">
                <span className={`chip ${when.today ? "warn" : ""}`}>{when.text}</span>
                <h2 className="ci-title">{event.title}</h2>
                <p className="small muted ci-meta">{[formatDay(event.date), time].filter(Boolean).join(" · ")}{place && <><br />{place}</>}</p>
                <p className="ci-count">
                  <strong>{event.arrived}</strong> <span className="muted">of {event.expected} checked in</span>
                  <span className="reg-meter" role="img" aria-label={`${share}% checked in`}><span style={{ width: `${share}%` }} /></span>
                </p>
              </div>
              <div className="actions ci-actions">
                  <a className={`btn ${when.past ? "ghost" : "gold"}`} href={`${base}/checkin/${event.id}`}>{when.past ? "Open check-in" : "Start check-in"}</a>
                  <a className="btn ghost" href={`${base}/checkin/${event.id}/display`}>Display screen</a>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** "Today", "Yesterday", "Tomorrow", "In 5 days", from Manila calendar dates. */
function whenLabel(date, today) {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (days === 0) return { text: "Today", today: true };
  if (days < 0) return { text: "Yesterday", past: true };
  if (days === 1) return { text: "Tomorrow" };
  return { text: `In ${days} days` };
}
