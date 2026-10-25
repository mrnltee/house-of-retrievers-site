import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { pageAdmin } from "../../../../lib/admin/guard";
import { Flash, NotAllowed, PageHead, formatDay, isoDate } from "../../ui";
import { cloudinaryConfig, photoUrl } from "../../../../lib/cloudinary.mjs";
import { JOURNEY_LIMITS } from "../../../../lib/journeyEntries.mjs";
import { monthLabel } from "../../../../lib/journeyStatus.mjs";
import ConfirmButton from "../../ConfirmButton";
import { deleteJourneyEntry, setJourneyEntryStatus, updateJourneyEntry } from "../../../journeyEntryActions";
import JourneyPhotos from "../JourneyPhotos";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

export default async function JourneyEntryPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { allowed } = await pageAdmin("media:edit");
  if (!allowed) return <NotAllowed />;
  if (!isUuid(id)) notFound();
  const [entry] = await sql(
    `SELECT j.*, e.title AS event_title, e.date AS event_date
       FROM journey_entries j LEFT JOIN events e ON e.id = j.event_id
      WHERE j.id = $1`,
    [id],
  );
  if (!entry) notFound();

  const config = cloudinaryConfig();
  const photoRows = await sql(
    `SELECT p.*, ep.public_id AS album_public_id FROM journey_entry_photos p
       LEFT JOIN event_photos ep ON ep.id = p.event_photo_id
      WHERE p.entry_id = $1 ORDER BY p.position, p.created_at`,
    [id],
  );
  const photos = photoRows.map((row) => {
    const publicId = row.public_id || row.album_public_id;
    return {
      id: row.id,
      alt: row.alt || "",
      fit: row.fit,
      source: row.public_id ? "upload" : row.static_src ? "file" : "album",
      thumb: row.static_src || (publicId && config ? photoUrl(config.cloudName, publicId, 480) : null),
    };
  });

  return (
    <>
      <PageHead title={entry.title} lead={`Status: ${entry.status === "published" ? "Published" : "Draft"}`} />
      <Flash params={query} />
      <EntryForm entry={entry} />
      <JourneyPhotos entryId={entry.id} hasEvent={Boolean(entry.event_id)} initialPhotos={photos} connected={Boolean(config)} />
      <DeleteEntryCard entry={entry} />
    </>
  );
}

function EntryForm({ entry }) {
  const linked = Boolean(entry.event_id);
  return (
    <section className="card">
      <h2>Details</h2>
      <form action={updateJourneyEntry} className="form">
        <input type="hidden" name="id" value={entry.id} />
        <input type="hidden" name="status" value={entry.status === "published" ? "draft" : "published"} />
        <label className="field"><span>Title</span><input type="text" name="title" maxLength={JOURNEY_LIMITS.title} required defaultValue={entry.title} /></label>
        <label className="field"><span>Theme (optional)</span><input type="text" name="theme" maxLength={JOURNEY_LIMITS.theme} defaultValue={entry.theme || ""} placeholder="A subtitle shown in italics" /></label>
        <label className="field"><span>Place (optional)</span><input type="text" name="place" maxLength={JOURNEY_LIMITS.place} defaultValue={entry.place || ""} placeholder="Venue and city" /></label>
        <label className="field"><span>Story (optional)</span><textarea name="story" maxLength={JOURNEY_LIMITS.story} rows={3} defaultValue={entry.story || ""} placeholder="One plain sentence: what happened, or why it matters" /></label>
        <label className="field"><span>Tag (optional)</span><input type="text" name="tag" maxLength={JOURNEY_LIMITS.tag} defaultValue={entry.tag || ""} placeholder="e.g. Milestone" /></label>
        <label className="field">
          <span>Gold marker (optional)</span>
          <select name="mark" defaultValue={entry.mark || ""}>
            <option value="">None</option>
            <option value="first">First</option>
            <option value="milestone">Milestone</option>
          </select>
        </label>
        {linked ? (
          <p className="small muted">
            Date: {entry.event_date ? formatDay(entry.event_date) : "—"} — follows the linked event ({entry.event_title}). Change the event's date to move this stop.
          </p>
        ) : (
          <label className="field">
            <span>Date (optional)</span>
            <input type="date" name="date" defaultValue={entry.happened_on ? isoDate(entry.happened_on) : ""} />
            {entry.month && !entry.happened_on && <small className="muted">Currently shows as {monthLabel(entry.month)} (no exact day). Saving with this blank will clear that and show "No date yet" — type a day only if you want to set one.</small>}
          </label>
        )}
        <div className="actions">
          <ConfirmButton
            className="btn gold"
            title="Save this stop?"
            items={["The wording (and date, if not linked to an event) is updated.", "Changes show on the homepage once it's published."]}
            yes="Save"
          >
            Save
          </ConfirmButton>
          <PublishButton entry={entry} />
        </div>
      </form>
    </section>
  );
}

// Inside the edit form (forms can't nest): its own action, reading the form's id and the hidden "status"
// field below (a button with a server action can't send its own name/value — React uses the name itself).
function PublishButton({ entry }) {
  const toPublish = entry.status !== "published";
  return (
    <ConfirmButton
      formAction={setJourneyEntryStatus}
      className={toPublish ? "btn gold" : "btn ghost"}
      title={toPublish ? "Publish this stop?" : "Hide this stop from the homepage?"}
      items={toPublish ? ["It appears on the homepage “Our journey” timeline right away.", "Unsaved changes to the wording above are not saved by this — press Save first."] : ["It's taken off the homepage. Nothing is deleted — publish again any time."]}
      yes={toPublish ? "Yes, publish" : "Yes, hide it"}
    >
      {toPublish ? "Publish" : "Unpublish"}
    </ConfirmButton>
  );
}

/** Delete for good, set apart from the editor, same pattern as events. */
function DeleteEntryCard({ entry }) {
  return (
    <section className="card danger-zone">
      <h2>Delete this stop</h2>
      <form action={deleteJourneyEntry} className="form">
        <input type="hidden" name="id" value={entry.id} />
        <p className="small">Removes the stop from the timeline for good. Uploaded photos are removed too; photos borrowed from an event's album, or files in <code>public/</code>, are left alone. This can't be undone.</p>
        <label className="check"><input type="checkbox" name="confirm" required /> I want to delete "{entry.title}" for good</label>
        <div className="actions">
          <ConfirmButton
            className="btn danger"
            title={`Delete “${entry.title}” for good?`}
            items={["The stop comes off the homepage timeline.", "Its uploaded photos are removed from storage."]}
            note="This can't be undone."
            yes="Yes, delete it for good"
            tone="danger"
          >
            Delete stop
          </ConfirmButton>
        </div>
      </form>
    </section>
  );
}
