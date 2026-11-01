import { notFound } from "next/navigation";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { can } from "../../../../../lib/admin/roles.mjs";
import { CONTACT_CATEGORIES, categoryOf, letterEmails, letterFor } from "../../../../../lib/contacts.mjs";
import { recipientFields } from "../../../../../lib/letters.mjs";
import { REPLIES, replyLabel, trackerCounts } from "../../../../../lib/eventBrands.mjs";
import { groupLetters, listLetters } from "../../../../../lib/letterStore";
import { refreshSends, sendsFor } from "../../../../../lib/letterSendsStore";
import { addGuestsToEvent, removeEventGuest, saveContact, saveEventGuest } from "../../../../contactActions";
import { Flash, NotAllowed, PageHead, formatDay } from "../../../ui";
import { Avatar } from "../../../ImageField";
import ConfirmButton from "../../../ConfirmButton";
import SendStatus from "../../../SendStatus";
import TickedSubmit from "../../../TickedSubmit";
import ContactFields from "../../../guests/ContactFields";

const greetingOf = (f) => f.salutation || f.contact || f.name;
const replyTone = { yes: "good", no: "alert", waiting: "" };

/**
 * An event's guest list (owner, 2026-11-01): politicians, speakers, celebrities,
 * VIPs, creators, media and donors invited to this event, grouped by category,
 * with their letter's email status and their reply for this event.
 */
export default async function EventGuestsPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("guests:view");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [event] = await sql("SELECT id, title, date FROM events WHERE id = $1", [id]);
  if (!event) notFound();
  const base = await adminBase();
  const canEdit = can(admin, "guests:edit");
  const canSend = canEdit && can(admin, "letters:edit");
  const [guests, others, letters, chosen] = await Promise.all([
    sql(`SELECT c.*, eg.reply, eg.notes AS event_notes FROM event_guests eg JOIN letter_contacts c ON c.id = eg.contact_id
          WHERE eg.event_id = $1 AND c.deleted_at IS NULL ORDER BY lower(c.name)`, [event.id]),
    sql(`SELECT id, name, organization, category, email FROM letter_contacts c WHERE deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM event_guests eg WHERE eg.event_id = $1 AND eg.contact_id = c.id) ORDER BY lower(name)`, [event.id]),
    listLetters(),
    groupLetters(),
  ]);
  const refs = guests.map((g) => `contact:${g.id}`);
  await refreshSends(refs);
  const sends = await sendsFor(refs, { eventId: event.id });
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  const eventLetter = letters.find((l) => l.eventId === event.id)?.key || null;
  const counts = trackerCounts(guests);
  const groups = CONTACT_CATEGORIES.map((c) => ({ ...c, letter: eventLetter || letterFor(c.key, chosen), rows: guests.filter((g) => g.category === c.key) })).filter((g) => g.rows.length);

  return (
    <>
      <PageHead title="Guest list" lead={`${event.title} · ${event.date ? formatDay(event.date) : "date to be set"}. Who's invited to this event, by group: tick people and send their letter; record their reply.`}>
        <a className="btn ghost" href={`${base}/events/${event.id}`}>Back to the event</a>
        <a className="btn ghost" href={`${base}/events/${event.id}/letters`}>Letters</a>
      </PageHead>
      <Flash params={query} />

      <section className="card tracker-summary">
        <span className="chip">{counts.invited} on the list</span>
        <span className="chip good">{counts.yes} coming</span>
        <span className="chip alert">{counts.no} can&apos;t make it</span>
        <span className="chip">{counts.waiting} no reply yet</span>
      </section>

      {canEdit && (
        <details className="card" open={guests.length === 0}>
          <summary className="strong">+ Add a guest</summary>
          <form action={saveContact} className="form" style={{ marginTop: 12 }}>
            <input type="hidden" name="event" value={event.id} />
            <ContactFields category={query?.category || ""} />
            <div className="actions"><ConfirmButton className="btn dark" title="Add to this event's guest list?" items={["They show in their group, ready for a letter.", "Nothing is emailed."]}>Add to the guest list</ConfirmButton></div>
          </form>
        </details>
      )}

      {canEdit && others.length > 0 && (
        <details className="card">
          <summary className="strong">+ Add from earlier guest lists <span className="muted small">({others.length})</span></summary>
          <form action={addGuestsToEvent} className="form" style={{ marginTop: 12 }}>
            <input type="hidden" name="event" value={event.id} />
            <p className="small muted" style={{ margin: 0 }}>People already in your guests (from other events or the old Guest list). Tick who to invite to this event; nothing is emailed.</p>
            {CONTACT_CATEGORIES.filter((c) => others.some((o) => o.category === c.key)).map((c) => (
              <fieldset key={c.key} className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="strong">{c.label}</legend>
                <ul className="tracker-pick">
                  {others.filter((o) => o.category === c.key).map((o) => (
                    <li key={o.id}><label className="check"><input type="checkbox" name="contact" value={o.id} /> <span>{o.name}{o.organization ? <span className="small muted"> · {o.organization}</span> : null}{!o.email && <span className="small muted"> · no email yet</span>}</span></label></li>
                  ))}
                </ul>
              </fieldset>
            ))}
            <div className="actions"><ConfirmButton className="btn dark" title="Add them to this event?" items={["They show on this guest list as No reply yet.", "Nothing is emailed."]}>Add to this event</ConfirmButton></div>
          </form>
        </details>
      )}

      {groups.length === 0 && <p className="card muted">No guests on this event yet.{canEdit && " Use + Add a guest above."}</p>}

      {groups.map((g) => (
        <section key={g.key} className="card">
          <form id={`send-${g.key}`} method="get" action={`${base}/letters/send`}>
            <input type="hidden" name="letter" value={g.letter} />
            <input type="hidden" name="event" value={event.id} />
            <div className="actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>{g.label} <span className="muted small">({g.rows.length})</span></h2>
                <p className="small muted" style={{ margin: "4px 0 0" }}>Letter: <a href={`${base}/letters/${g.letter}`}>{letterName(g.letter)}</a>. You can pick another on the next page.</p>
              </div>
              {canSend && <TickedSubmit />}
            </div>
          </form>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead><tr>{canSend && <th><span className="sr-only">Pick</span></th>}<th>Name</th><th>Email</th><th>Greeting</th><th>Email status</th><th>Reply</th></tr></thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.id}>
                    {canSend && <td><input type="checkbox" form={`send-${g.key}`} name="to" value={`contact:${r.id}`} aria-label={`Pick ${r.name}`} /></td>}
                    <td className="strong">
                      <span className="row-name"><Avatar photo={r.photo} logo={r.logo} name={r.name} /><span><a href={`${base}/guests/${r.id}?event=${event.id}`}>{r.name}</a>{r.organization && <><br /><span className="small muted">{r.organization}</span></>}</span></span>
                      {canEdit && (
                        <details className="tracker-edit">
                          <summary className="small">Reply &amp; notes</summary>
                          <form action={saveEventGuest} className="form">
                            <input type="hidden" name="event" value={event.id} />
                            <input type="hidden" name="contact" value={r.id} />
                            <label className="field"><span>Their reply</span><select name="reply" defaultValue={r.reply}>{REPLIES.map(([k, l]) => <option key={k} value={k}>{k === "yes" ? "Coming" : k === "no" ? "Can't make it" : l}</option>)}</select></label>
                            <label className="field"><span>Notes for this event <small>Only admins see these</small></span><textarea name="notes" rows={2} maxLength={1000} defaultValue={r.event_notes || ""} /></label>
                            <div className="actions">
                              <ConfirmButton className="btn dark" title={`Save ${r.name}'s reply?`} items={["For this event only."]}>Save</ConfirmButton>
                              <ConfirmButton className="btn ghost" formAction={removeEventGuest} tone="alert" title={`Take ${r.name} off this event?`} items={["They stay in your guests for other events.", "Letters already sent stay in the log."]}>Remove from this event</ConfirmButton>
                            </div>
                          </form>
                        </details>
                      )}
                    </td>
                    <td>{letterEmails(r).to || <span className="muted">No email yet</span>}{r.rep_name && <><br /><span className="small muted">Rep: {r.rep_name}{r.send_to !== "person" ? " (gets letters)" : ""}</span></>}</td>
                    <td className="small">Dear {greetingOf(recipientFields({ contact: r }))},</td>
                    <td className="small"><SendStatus sends={sends[`contact:${r.id}`]} letterName={letterName} /></td>
                    <td><span className={`chip ${replyTone[r.reply]}`.trim()}>{r.reply === "yes" ? "Coming" : r.reply === "no" ? "Can't make it" : replyLabel(r.reply)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
