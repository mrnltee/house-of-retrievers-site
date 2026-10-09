import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { DateBox, NotAllowed, PageHead, manilaToday } from "../ui";

export default async function CheckInIndex() {
  const { allowed } = await pageAdmin("checkin");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const rows = await sql(
    `SELECT id, title, date FROM events WHERE registration='required' AND status='published' AND date >= ($1::date - 1) ORDER BY date LIMIT 10`,
    [manilaToday()],
  );
  return (
    <>
      <PageHead title="Check-in" lead="Pick the event, then scan the QR on each person's confirmation." />
      <section className="card">
        {rows.length === 0 && <p className="muted">No published events with RSVPs coming up.</p>}
        {rows.map((event) => (
          <div className="task" key={event.id}>
            <DateBox date={event.date} />
            <div><strong>{event.title}</strong></div>
            <a className="btn gold small" href={`${base}/checkin/${event.id}`}>Start</a>
          </div>
        ))}
      </section>
    </>
  );
}
