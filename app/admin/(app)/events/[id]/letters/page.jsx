import { notFound } from "next/navigation";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { can } from "../../../../../lib/admin/roles.mjs";
import { EVENT_FILLS } from "../../../../../lib/letterEvent.mjs";
import { eventFills } from "../../../../../lib/letterEventStore";
import { listLetters } from "../../../../../lib/letterStore";
import { createEventLetter, deleteLetter } from "../../../../letterActions";
import WordImport from "../../../letters/WordImport";
import { listDesigns } from "../../../../../lib/emailDesignStore";
import { designLabel, kindLabel } from "../../../../../lib/emailDesign.mjs";
import { createDesign, deleteDesign } from "../../../../emailDesignActions";
import { Flash, NotAllowed, PageHead, formatDay, formatWhen } from "../../../ui";
import ConfirmButton from "../../../ConfirmButton";

/**
 * An event's letters (owner, 2026-11-01): invites and other letters made for
 * this event, from an existing letter or blank. Their [Event …] blanks fill in
 * from the event; the Brand tracker sends them.
 */
export default async function EventLettersPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("letters:view");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [event] = await sql("SELECT id, title, date FROM events WHERE id = $1", [id]);
  if (!event) notFound();
  const base = await adminBase();
  const canEdit = can(admin, "letters:edit");
  const [all, fills, designs] = await Promise.all([listLetters(), eventFills(event.id), listDesigns({ eventId: event.id })]);
  const ownDesigns = designs.filter((d) => d.event_id === event.id);
  const libraryDesigns = designs.filter((d) => !d.event_id);
  const mine = all.filter((l) => l.eventId === event.id);
  const general = all.filter((l) => !l.eventId);
  const nameOf = (key) => all.find((l) => l.key === key)?.name || key;

  return (
    <>
      <PageHead title="Event letters" lead={`${event.title} · ${event.date ? formatDay(event.date) : "date to be set"}. Invites, proposals and other letters for this event: each gets its covering email and PDF, with the event's details filled in.`}>
        <a className="btn ghost" href={`${base}/events/${event.id}`}>Back to the event</a>
        <a className="btn ghost" href={`${base}/events/${event.id}/brands`}>Brands &amp; partnerships</a>
      </PageHead>
      <Flash params={query} />

      <section className="card">
        <h2>Letters for this event <span className="muted small">({mine.length})</span></h2>
        {mine.length ? (
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead><tr><th>Letter</th><th>Started from</th><th>Last saved</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {mine.map((l) => (
                  <tr key={l.key}>
                    <td className="strong"><a href={`${base}/letters/${l.key}`}>{l.name}</a><br /><span className="small muted">{l.subject}</span></td>
                    <td className="small">{l.invitation?.on ? "Invitation card" : l.basedOn ? nameOf(l.basedOn) : "Blank"}</td>
                    <td className="small">{l.updatedAt ? formatWhen(l.updatedAt) : "—"}</td>
                    <td>
                      <span className="actions" style={{ justifyContent: "flex-end" }}>
                        <a className="btn small" href={`${base}/letters/${l.key}`}>Edit</a>
                        {canEdit && (
                          <form action={deleteLetter}>
                            <input type="hidden" name="key" value={l.key} />
                            <ConfirmButton className="btn small ghost" tone="alert" title={`Remove “${l.name}”?`} items={["Letters already sent stay sent.", "The letter it started from isn't touched."]} yes="Yes, remove">Remove</ConfirmButton>
                          </form>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="small muted" style={{ marginTop: 8 }}>No letters for this event yet. Make one below; the Brand tracker sends it.</p>}
      </section>

      <section className="card">
        <h2>Email designs for this event</h2>
        <p className="small muted" style={{ margin: "4px 0 10px" }}>Designed emails (invites, follow-ups, thank-yous) to pick on the send page. This event's copies change only here; the library stays as it is. <a href={`${base}/emails/designs`}>Open the library</a>.</p>
        {ownDesigns.length ? (
          <ul className="plain-list design-list">
            {ownDesigns.map((d) => (
              <li key={d.id}>
                <a href={`${base}/emails/designs/${d.id}`}><strong>{d.name}</strong></a>
                <span className="small muted"> · {kindLabel(d.kind)} · {formatWhen(d.updated_at)}</span>
                {canEdit && (
                  <span className="design-row-actions">
                    <form action={deleteDesign}><input type="hidden" name="id" value={d.id} /><ConfirmButton className="btn ghost small" tone="danger" title={`Delete “${d.name}”?`} items={["Only this event's copy goes; the library is unchanged", "Emails already sent are unchanged"]} note="This can't be undone." yes="Yes, delete">Delete</ConfirmButton></form>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="small muted">No copies for this event yet; the send page offers the library designs.</p>}
        {canEdit && (libraryDesigns.length ? (
          <form action={createDesign} className="actions" style={{ marginTop: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <input type="hidden" name="event" value={event.id} />
            <label className="field" style={{ flex: "1 1 260px" }}><span>Make a copy for this event</span>
              <select name="from" required defaultValue="">
                <option value="" disabled>Pick a library design…</option>
                {libraryDesigns.map((d) => <option key={d.id} value={d.id}>{designLabel(d)}</option>)}
              </select>
            </label>
            <ConfirmButton className="btn ghost" title="Make a copy of this design for the event?" items={["It opens in the editor", "The library design stays as it is", "Nothing is sent"]} yes="Yes, make a copy">Make a copy</ConfirmButton>
          </form>
        ) : <p className="small muted">The library is empty. <a href={`${base}/emails/designs`}>Make a design there</a> first.</p>)}
      </section>

      {canEdit && (
        <section className="card">
          <h2>New letter for this event</h2>
          <form action={createEventLetter} className="form" style={{ marginTop: 10 }}>
            <input type="hidden" name="event" value={event.id} />
            <div className="row-2">
              <label className="field"><span>Start from <small>A copy is made for this event; the original in Letters stays as it is. A Word file below is used instead, if you pick one.</small></span>
                <select name="from" defaultValue={general.find((l) => l.key.startsWith("sponsor"))?.key || ""}>
                  <option value="">Blank letter</option>
                  <option value="invitation-card">Invitation card (personalised for each guest)</option>
                  {general.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
                </select>
              </label>
              <label className="field"><span>Name <small>Optional, e.g. Sponsor invite</small></span><input type="text" name="name" maxLength={80} placeholder={`… — ${event.title}`} /></label>
            </div>
            <WordImport />
            <div className="actions"><ConfirmButton className="btn dark" title="Make this letter for the event?" items={["It opens in the letter editor.", "Nothing is sent."]}>Make the letter</ConfirmButton></div>
          </form>
        </section>
      )}

      <section className="card">
        <h2>Event fill-ins</h2>
        <p className="small muted" style={{ margin: "4px 0 10px" }}>Write these in any letter for this event; they fill in by themselves. Sponsors and partners come from the Brand tracker (those who said Yes); beneficiaries from the event form.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fill-in</th><th>For this event</th></tr></thead>
            <tbody>
              {Object.entries(EVENT_FILLS).map(([label, hint]) => (
                <tr key={label}><td><span className="tag-badge var-chip">[{label}]</span></td><td className="small">{fills[label] || <span className="muted">Not set yet · {hint}</span>}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
