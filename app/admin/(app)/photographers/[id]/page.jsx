import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { loadPhotographer } from "../../../../lib/photographersStore";
import { removePhotographer } from "../../../photographerActions";
import { Flash, NotAllowed, PageHead, isoDate } from "../../ui";
import ConfirmButton from "../../ConfirmButton";
import PhotographerForm from "../PhotographerForm";

/** One photographer: their record and the events they're credited on. */
export default async function PhotographerPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("photographers:view");
  if (!allowed) return <NotAllowed />;
  const row = await loadPhotographer(id);
  if (!row) notFound();
  const base = await adminBase();
  const canEdit = can(admin, "photographers:edit");
  const events = await sql("SELECT e.id, e.title, e.date FROM event_photographers ep JOIN events e ON e.id = ep.event_id WHERE ep.photographer_id = $1 ORDER BY e.date DESC", [row.id]);
  return (
    <>
      <p className="small"><a href={`${base}/photographers`}>← Photographers</a></p>
      <PageHead title={row.name} lead={row.show_on_site ? "Shown on the website under “Photos by”." : "Not on the website yet."} />
      <Flash params={query} />
      <div className="grid-2 supporter-grid">
        <PhotographerForm row={row} canEdit={canEdit} />
        <div className="form" style={{ gap: 20 }}>
          <section className="card">
            <h2>Events</h2>
            {events.length ? (
              <ul className="plain-list">{events.map((e) => <li key={e.id}><a href={`${base}/events/${e.id}`}>{e.title}</a> <span className="small muted">· {e.date ? isoDate(e.date) : "no date"}</span></li>)}</ul>
            ) : <p className="small muted">Not credited on any event yet. Open an event and tick them under “Photos by”.</p>}
          </section>
          {canEdit && (
            <section className="card danger-zone">
              <h2>Remove this photographer</h2>
              <p className="small muted">Takes them off the list and off every event's “Photos by”.</p>
              <form action={removePhotographer}>
                <input type="hidden" name="id" value={row.id} />
                <ConfirmButton className="btn danger" tone="danger" title={`Remove ${row.name}?`} items={["They're taken off every event's “Photos by”", "The event photos stay"]} yes="Yes, remove">Remove photographer</ConfirmButton>
              </form>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
