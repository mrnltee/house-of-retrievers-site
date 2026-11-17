import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { sql, hasDatabase } from "../../../lib/db";
import { PageHead, Flash, NotAllowed, formatDay } from "../ui";
import JourneySettingsForm from "./JourneySettingsForm";
import { DEFAULT_JOURNEY_SETTINGS, cleanJourneyOrientation, cleanJourneyShow } from "../../../lib/journeySettings.mjs";
import { entryStatus, manilaDate, sortEntries } from "../../../lib/journeyEntries.mjs";
import { cloudinaryConfig, photoUrl } from "../../../lib/cloudinary.mjs";
import { can } from "../../../lib/admin/roles.mjs";
import EditDialog from "../EditDialog";
import { monthLabel } from "../../../lib/journeyStatus.mjs";
import ConfirmButton from "../ConfirmButton";
import { createJourneyFromEvent, createJourneyMilestone } from "../../journeyEntryActions";

export const dynamic = "force-dynamic";

export default async function JourneyAdminPage({ searchParams }) {
  const { admin, allowed } = await pageAdmin("journey:view");
  if (!allowed) return <NotAllowed />;
  const params = await searchParams;
  const base = await adminBase();
  const canEdit = can(admin, "journey:edit");
  const [row] = hasDatabase() ? await sql("SELECT show, orientation, updated_at, updated_by FROM journey_settings WHERE id=true") : [];
  const settings = row
    ? { show: cleanJourneyShow(row.show), orientation: cleanJourneyOrientation(row.orientation) }
    : DEFAULT_JOURNEY_SETTINGS;
  const freeEvents = hasDatabase()
    ? await sql(
        `SELECT e.id, e.title, e.date FROM events e
          WHERE NOT EXISTS (SELECT 1 FROM journey_entries j WHERE j.event_id = e.id)
          ORDER BY e.date DESC`,
      )
    : [];
  return (
    <>
      <PageHead title="Journey timeline" lead="The stops on the home page's “Our journey”, oldest first, and how the section looks. New stops start as drafts: check the wording, add photos, then publish.">
        {canEdit && <AddFromEvent freeEvents={freeEvents} />}
        {canEdit && <AddMilestone />}
      </PageHead>
      <Flash params={params} />
      <TimelineStops base={base} show={params?.show} />
      <JourneySettingsForm settings={settings} updatedAt={row?.updated_at} updatedBy={row?.updated_by} />
    </>
  );
}

function AddFromEvent({ freeEvents }) {
  return (
    <EditDialog label="+ Add from an event" buttonClass="btn gold" title="Add a stop from an event" lead="The stop takes the event's title, date, venue and summary. Its date follows the event if the event moves.">
      {freeEvents.length === 0 ? (
        <p className="small muted">Every event already has a stop, or there are no events yet.</p>
      ) : (
        <form action={createJourneyFromEvent} className="form">
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
              Add as a draft
            </ConfirmButton>
          </div>
        </form>
      )}
    </EditDialog>
  );
}

function AddMilestone() {
  return (
    <EditDialog label="+ Add a milestone" buttonClass="btn ghost" title="Add a milestone" lead="For a moment that isn't an event, like registering with the SEC.">
      <form action={createJourneyMilestone} className="form">
        <label className="field"><span>Title</span><input type="text" name="title" maxLength={120} required placeholder="e.g. Registered with the SEC" /></label>
        <label className="field"><span>Date <small>Optional; leave it blank if you're not sure yet</small></span><input type="date" name="date" /></label>
        <div className="actions">
          <ConfirmButton
            className="btn gold"
            title="Add this milestone to the timeline?"
            items={["A new draft stop is created with this title.", "Review the wording and add photos, then publish."]}
            yes="Add"
          >
            Add as a draft
          </ConfirmButton>
        </div>
      </form>
    </EditDialog>
  );
}

/** The stops: tabs by status, one row each (a card on phones), what each still needs. */
async function TimelineStops({ base, show }) {
  const config = cloudinaryConfig();
  const rows = hasDatabase()
    ? await sql(
        `SELECT j.id, j.title, j.status, j.happened_on, j.month, j.position, j.event_id, j.place, e.title AS event_title,
                (SELECT count(*)::int FROM journey_entry_photos p WHERE p.entry_id = j.id) AS photo_count,
                f.static_src AS thumb_src, COALESCE(f.public_id, ep.public_id) AS thumb_id
           FROM journey_entries j LEFT JOIN events e ON e.id = j.event_id
           LEFT JOIN LATERAL (SELECT * FROM journey_entry_photos p WHERE p.entry_id = j.id ORDER BY p.position, p.created_at LIMIT 1) f ON true
           LEFT JOIN event_photos ep ON ep.id = f.event_photo_id`,
      )
    : [];
  const all = sortEntries(rows);
  const drafts = all.filter((s) => s.status !== "published").length;
  const tab = show === "draft" && drafts ? "draft" : show === "published" ? "published" : "all";
  const stops = tab === "all" ? all : all.filter((s) => (tab === "draft" ? s.status !== "published" : s.status === "published"));
  const today = manilaDate();
  const thumb = (s) => s.thumb_src || (s.thumb_id && config ? photoUrl(config.cloudName, s.thumb_id, 160) : null);
  const tabs = [["all", "All", all.length], ["published", "On the website", all.length - drafts], ["draft", "Drafts", drafts]].filter(([k, , n]) => k === "all" || k === tab || n > 0);

  return (
    <section className="jt-stops">
      {(drafts > 0 || tab !== "all") && <nav className="tabs" aria-label="Show">
        {tabs.map(([k, label, n]) => <a key={k} href={k === "all" ? `${base}/journey` : `${base}/journey?show=${k}`} aria-current={tab === k ? "page" : undefined}>{label} · {n}</a>)}
      </nav>}
      <div className="table-wrap">
        <table className="stack-table admin-events jt-table">
          <thead><tr><th>Stop</th><th>When</th><th>Status</th><th>Photos</th><th><span className="visually-hidden">Edit</span></th></tr></thead>
          <tbody>
            {stops.length === 0 && <tr><td colSpan={5} className="empty">{tab === "all" ? "No stops yet. Add one from an event, or a milestone." : "Nothing here."}</td></tr>}
            {stops.map((entry) => {
              const src = thumb(entry);
              const when = entry.happened_on ? formatDay(entry.happened_on) : entry.month ? monthLabel(entry.month) : null;
              const upcoming = entryStatus(entry, today) === "upcoming" && when;
              return (
                <tr key={entry.id}>
                  <td className="st-1">
                    <div className="ev-row">
                      {src ? <img className="jt-thumb" src={src} alt="" loading="lazy" /> : <span className="jt-thumb ev-thumb-empty" aria-hidden="true" />}
                      <span>
                        <a className="ev-title" href={`${base}/journey/${entry.id}`}>{entry.title}</a>
                        <span className="small muted ev-meta">{[entry.event_title ? (entry.event_title === entry.title ? "Linked to its event" : `Linked to ${entry.event_title}`) : "", entry.place].filter(Boolean).join(" · ")}</span>
                      </span>
                    </div>
                  </td>
                  <td className="st-2 ev-when" data-label="When">{when || <span className="chip warn">No date yet</span>}{upcoming && <><br /><span className="small muted">Coming up</span></>}</td>
                  <td className="st-3" data-label="Status"><span className={`chip ${entry.status === "published" ? "good" : ""}`}>{entry.status === "published" ? "On the website" : "Draft"}</span></td>
                  <td className="st-4" data-label="Photos">{entry.photo_count ? `${entry.photo_count} photo${entry.photo_count === 1 ? "" : "s"}` : <span className="chip warn">No photos</span>}</td>
                  <td className="st-5"><a className="btn ghost small" href={`${base}/journey/${entry.id}`} aria-label={`Edit ${entry.title}`}>Edit</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
