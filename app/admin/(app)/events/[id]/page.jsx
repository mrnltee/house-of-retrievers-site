import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { Flash, NotAllowed, PageHead } from "../../ui";
import EventForm from "../EventForm";
import ShareMenu from "../../../../components/ShareMenu";
import { toPublicEvent } from "../../../../lib/admin/events.mjs";
import { eventUrl, shareCaption } from "../../../../lib/share.mjs";

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
        {event.status === "published" && <a className="btn ghost" href={eventUrl(event.slug)} target="_blank" rel="noreferrer">View event page</a>}
      </PageHead>
      <Flash params={query} />
      {event.status === "published" && <ShareCard event={event} />}
      <EventForm event={event} autoDescribe={Boolean(process.env.GEMINI_API_KEY)} />
    </>
  );
}

/** Share links for a published event, plus a ready caption and the cover for Instagram. */
function ShareCard({ event }) {
  const shared = toPublicEvent(event);
  return (
    <section className="card">
      <div className="page-head" style={{ alignItems: "center" }}>
        <h2>Share this event</h2>
        <a className="small" href={eventUrl(event.slug)} target="_blank" rel="noreferrer">{eventUrl(event.slug).replace("https://", "")}</a>
      </div>
      <ShareMenu event={shared} inline />
      <details>
        <summary className="linkish">Caption for Instagram</summary>
        <textarea readOnly rows={9} defaultValue={shareCaption(shared)} style={{ marginTop: 8 }} aria-label="Caption for Instagram" />
      </details>
      {event.image && (
        <p className="small muted">
          Instagram posts need the picture too: <a className="linkish" href={event.image} download={`${event.slug}.jpg`}>download the cover photo</a>.
        </p>
      )}
    </section>
  );
}
