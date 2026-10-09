import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { pageAdmin } from "../../../../lib/admin/guard";
import { NotAllowed } from "../../ui";
import Scanner from "./Scanner";

export default async function CheckInPage({ params }) {
  const { eventId } = await params;
  const { allowed } = await pageAdmin("checkin");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const [event] = await sql(
    `SELECT e.id, e.title,
       (SELECT count(*)::int FROM registrations r WHERE r.event_id=e.id AND r.status='confirmed') AS confirmed,
       (SELECT count(*)::int FROM registrations r WHERE r.event_id=e.id AND r.status='confirmed' AND r.checked_in_at IS NOT NULL) AS checked
     FROM events e WHERE e.id=$1`,
    [eventId],
  );
  if (!event) notFound();
  return <Scanner eventId={event.id} title={event.title} confirmed={event.confirmed} initialChecked={event.checked} />;
}
