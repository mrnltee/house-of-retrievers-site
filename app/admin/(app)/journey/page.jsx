import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { sql, hasDatabase } from "../../../lib/db";
import { PageHead, Flash, NotAllowed, formatDay } from "../ui";
import JourneySettingsForm from "./JourneySettingsForm";
import { DEFAULT_JOURNEY_SETTINGS, cleanJourneyOrientation, cleanJourneyShow } from "../../../lib/journeySettings.mjs";
import { sortEntries } from "../../../lib/journeyEntries.mjs";
import { monthLabel } from "../../../lib/journeyStatus.mjs";
import ConfirmButton from "../ConfirmButton";
import { createJourneyFromEvent, createJourneyMilestone } from "../../journeyEntryActions";

export const dynamic = "force-dynamic";

export default async function JourneyAdminPage({ searchParams }) {
  const { allowed } = await pageAdmin("media:edit");
  if (!allowed) return <NotAllowed />;
  const params = await searchParams;
  const base = await adminBase();
  const [row] = hasDatabase() ? await sql("SELECT show, orientation, updated_at, updated_by FROM journey_settings WHERE id=true") : [];
  const settings = row
    ? { show: cleanJourneyShow(row.show), orientation: cleanJourneyOrientation(row.orientation) }
    : DEFAULT_JOURNEY_SETTINGS;
  return (
    <>
      <PageHead title="Journey timeline" lead="Control whether the homepage “Our journey” timeline shows, and which layout it uses." />
      <Flash params={params} />
      <JourneySettingsForm settings={settings} updatedAt={row?.updated_at} updatedBy={row?.updated_by} />
      <TimelineStopsCard base={base} />
    </>
  );
}

/** The stops themselves: a list, plus ways to add one. */
async function TimelineStopsCard({ base }) {
  const rows = hasDatabase()
    ? await sql(
        `SELECT j.id, j.title, j.status, j.happened_on, j.month, j.position, j.event_id, e.title AS event_title,
                (SELECT count(*)::int FROM journey_entry_photos p WHERE p.entry_id = j.id) AS photo_count
           FROM journey_entries j LEFT JOIN events e ON e.id = j.event_id`,
      )
    : [];
  const stops = sortEntries(rows);
  const freeEvents = hasDatabase()
    ? await sql(
        `SELECT e.id, e.title, e.date FROM events e
          WHERE NOT EXISTS (SELECT 1 FROM journey_entries j WHERE j.event_id = e.id)
          ORDER BY e.date DESC`,
      )
    : [];

  return (
    <section className="card">
      <div className="page-head" style={{ alignItems: "center" }}>
        <h2>Timeline stops</h2>
        <span className="small muted">{stops.length} {stops.length === 1 ? "stop" : "stops"}</span>
      </div>
      <p className="small muted">
        Add a stop from an existing event, or type a milestone that has no event (like joining the SEC). New stops start as a draft — review the wording and add photos, then publish.
      </p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>Stop</th><th>Status</th><th>Photos</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {stops.length === 0 && <tr><td colSpan={5} className="empty">No stops yet.</td></tr>}
            {stops.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.happened_on ? formatDay(entry.happened_on) : entry.month ? monthLabel(entry.month) : "No date yet"}</td>
                <td className="strong">
                  {entry.title}
                  {entry.event_title && <><br /><span className="small muted">Linked to {entry.event_title}</span></>}
                </td>
                <td><span className={`chip ${entry.status === "published" ? "good" : ""}`}>{entry.status === "published" ? "Published" : "Draft"}</span></td>
                <td>{entry.photo_count}</td>
                <td className="actions"><a className="linkish" href={`${base}/journey/${entry.id}`}>Edit</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 20 }}>
        <form action={createJourneyFromEvent} className="form">
          <h3>Add from an event</h3>
          {freeEvents.length === 0 ? (
            <p className="small muted">Every event already has a stop, or there are no events yet.</p>
          ) : (
            <>
              <label className="field">
                <span>Event</span>
                <select name="eventId" required defaultValue="">
                  <option value="" disabled>Choose an event…</option>
                  {freeEvents.map((event) => <option key={event.id} value={event.id}>{event.title} — {formatDay(event.date)}</option>)}
                </select>
              </label>
              <div className="actions">
                <ConfirmButton
                  className="btn gold"
                  title="Add this event to the timeline?"
                  items={["A new draft stop is created with the event's title, date, venue and summary.", "Its date will follow the event if the event date ever changes.", "Review the wording and add photos, then publish."]}
                  yes="Add"
                >
                  Add from event
                </ConfirmButton>
              </div>
            </>
          )}
        </form>

        <form action={createJourneyMilestone} className="form">
          <h3>Add a milestone</h3>
          <label className="field"><span>Title</span><input type="text" name="title" maxLength={120} required placeholder="e.g. Registered with the SEC" /></label>
          <label className="field"><span>Date (optional)</span><input type="date" name="date" /></label>
          <div className="actions">
            <ConfirmButton
              className="btn gold"
              title="Add this milestone to the timeline?"
              items={["A new draft stop is created with this title.", "Review the wording and add photos, then publish."]}
              yes="Add"
            >
              Add milestone
            </ConfirmButton>
          </div>
        </form>
      </div>
    </section>
  );
}
