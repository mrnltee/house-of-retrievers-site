import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { EVENTS_URL } from "../../../../lib/eventsHost.mjs";
import { Flash, NotAllowed, PageHead } from "../../ui";
import EventForm from "../EventForm";

export default async function EditEventPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { allowed } = await pageAdmin("events:edit");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [event] = await sql("SELECT * FROM events WHERE id = $1", [id]);
  if (!event) notFound();
  const base = await adminBase();

  return (
    <>
      <PageHead title={event.title} lead={`Status: ${event.status}`}>
        {event.registration === "required" && <a className="btn ghost" href={`${base}/registrations/${event.id}`}>RSVPs</a>}
        {event.status === "published" && <a className="btn ghost" href={`${EVENTS_URL}/`} target="_blank" rel="noreferrer">View events page</a>}
      </PageHead>
      <Flash params={query} />
      <EventForm event={event} />
    </>
  );
}
