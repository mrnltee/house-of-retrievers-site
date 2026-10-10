import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { actionLabel } from "../../../../lib/admin/activity.mjs";
import { MEMBERSHIP, PEOPLE_STATUSES, memberNumber, membershipLabel } from "../../../../lib/admin/people.mjs";
import { emailReady } from "../../../../lib/email";
import { resendWelcome, updateMembership, updatePerson } from "../../../actions";
import { Flash, NotAllowed, PageHead, formatWhen, isoDate } from "../../ui";
import PersonAvatar from "../PersonAvatar";

const REG_STATUS = { confirmed: "Going", waitlist: "Waitlist", cancelled: "Cancelled" };

/**
 * One person: photo, contact, membership, follow-up and notes, the events
 * they signed up for (matched by email), and everything that happened to
 * their record, from the activity log.
 */
export default async function PersonPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("people:view");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [person] = await sql("SELECT * FROM people WHERE id = $1", [id]);
  if (!person) notFound();
  const base = await adminBase();
  const [events, history, others] = await Promise.all([
    sql(
      `SELECT r.status, r.checked_in_at, r.fee_status, r.created_at, e.id AS event_id, e.title, e.date
         FROM registrations r JOIN events e ON e.id = r.event_id
        WHERE lower(r.email) = lower($1) ORDER BY e.date DESC LIMIT 50`,
      [person.email],
    ),
    sql("SELECT at, actor_email, action, details FROM activity_log WHERE details->>'personId' = $1 ORDER BY at DESC LIMIT 50", [id]),
    sql("SELECT id, kind FROM people WHERE lower(email) = lower($1) AND id <> $2", [person.email, id]),
  ]);
  const canEdit = can(admin.roles, "people:edit");
  const member = person.kind === "Member";
  const attended = events.filter((e) => e.checked_in_at).length;
  const lastSeen = events.find((e) => e.checked_in_at);
  const ready = emailReady();

  return (
    <>
      <p className="small"><a href={`${base}/people?kind=${person.kind}`}>← {person.kind}s</a></p>
      <div className="person-head">
        <PersonAvatar person={person} base={base} size={96} />
        <div>
          <PageHead title={person.name} lead={[person.kind, member && person.member_no ? memberNumber(person.member_no) : "", member ? membershipLabel(person.membership) : person.status].filter(Boolean).join(" · ")} />
        </div>
      </div>
      <Flash params={query} />

      <div className="grid-2 person-grid">
        <section className="card">
          <h2>Contact</h2>
          <dl className="facts">
            <div><dt>Email</dt><dd><a href={`mailto:${person.email}`}>{person.email}</a></dd></div>
            {person.social_profile && <div><dt>Social</dt><dd>{person.social_url ? <a href={person.social_url} target="_blank" rel="noreferrer">{person.social_profile}</a> : person.social_profile}</dd></div>}
            {person.organization && <div><dt>Organization</dt><dd>{person.organization}</dd></div>}
            {person.furbaby_name && <div><dt>Furbaby</dt><dd>{person.furbaby_name}</dd></div>}
            <div><dt>Joined</dt><dd>{formatWhen(person.created_at)}{person.joined_count > 1 && <> · sent the form {person.joined_count} times, last {formatWhen(person.last_joined_at)}</>}</dd></div>
            {others.length > 0 && <div><dt>Also</dt><dd>{others.map((o) => <a key={o.id} href={`${base}/people/${o.id}`} className="chip" style={{ marginRight: 6 }}>{o.kind}</a>)}</dd></div>}
          </dl>
          {!person.photo_id && <p className="small muted">No photo here. Photos sent before 11 Oct 2026 are in the "HOR Member photos" Drive folder, linked from the sheet.</p>}
          {person.message && (
            <>
              <h3>What they wrote</h3>
              <p className="person-message">{person.message}</p>
            </>
          )}
        </section>

        <div className="form" style={{ gap: 20 }}>
          {member && (
            <section className="card">
              <h2>Membership</h2>
              <dl className="facts">
                <div><dt>Status</dt><dd><span className={`chip membership-${person.membership}`}>{membershipLabel(person.membership)}</span></dd></div>
                {person.member_no && <div><dt>Number</dt><dd>{memberNumber(person.member_no)}</dd></div>}
                {person.member_since && <div><dt>Since</dt><dd>{isoDate(person.member_since)}</dd></div>}
              </dl>
              {canEdit && (
                <form action={updateMembership} className="form" style={{ gap: 12 }}>
                  <input type="hidden" name="id" value={person.id} />
                  <fieldset className="plain">
                    <legend>Change to</legend>
                    {MEMBERSHIP.map(([key, label, hint]) => (
                      <label key={key} className="check"><input type="radio" name="membership" value={key} defaultChecked={person.membership === key} /> <span><strong>{label}</strong> <span className="small muted">{hint}</span></span></label>
                    ))}
                  </fieldset>
                  {!person.member_no && (
                    <label className="check">
                      <input type="checkbox" name="sendWelcome" defaultChecked={ready} disabled={!ready} />
                      <span>Send the welcome email when they become Active{!ready && <span className="small muted"> (switches on once the Resend key is in Vercel)</span>}</span>
                    </label>
                  )}
                  <div className="actions"><button className="btn gold">Save membership</button></div>
                </form>
              )}
              {canEdit && person.membership === "active" && ready && (
                <form action={resendWelcome} style={{ marginTop: 8 }}>
                  <input type="hidden" name="id" value={person.id} />
                  <button className="linkish">Send the welcome email again</button>
                </form>
              )}
            </section>
          )}

          <section className="card">
            <h2>Follow-up</h2>
            {canEdit ? (
              <form action={updatePerson} className="form" style={{ gap: 12 }}>
                <input type="hidden" name="id" value={person.id} />
                <input type="hidden" name="kind" value={person.kind} />
                <input type="hidden" name="back" value="profile" />
                <label className="field"><span>Status</span>
                  <select name="status" defaultValue={person.status}>
                    {PEOPLE_STATUSES[person.kind].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label className="field"><span>Notes <small>Only admins see these</small></span>
                  <textarea name="notes" rows={4} maxLength={2000} defaultValue={person.notes || ""} />
                </label>
                <div className="actions"><button className="btn ghost">Save follow-up</button></div>
              </form>
            ) : (
              <p><span className="chip">{person.status}</span> {person.notes}</p>
            )}
          </section>
        </div>
      </div>

      <section className="card">
        <div className="page-head" style={{ alignItems: "baseline" }}>
          <h2>Events</h2>
          <span className="small muted">{events.length ? `${events.length} signed up · ${attended} attended${lastSeen ? ` · last seen ${isoDate(lastSeen.date)}` : ""}` : "None yet"}</span>
        </div>
        {events.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Event</th><th>Date</th><th>RSVP</th><th>Checked in</th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={`${e.event_id}-${e.created_at}`}>
                    <td><a href={`${base}/registrations/${e.event_id}`}>{e.title}</a></td>
                    <td>{isoDate(e.date)}</td>
                    <td>{REG_STATUS[e.status] || e.status}{e.fee_status === "waiting" ? " · fee due" : e.fee_status === "paid" ? " · paid" : ""}</td>
                    <td>{e.checked_in_at ? formatWhen(e.checked_in_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="small muted">Matched by email: once {person.name.split(" ")[0]} RSVPs with {person.email}, their events show here.</p>
        )}
      </section>

      <section className="card">
        <h2>History</h2>
        {history.length ? (
          <ol className="person-history">
            {history.map((h, i) => (
              <li key={i}>
                <span className="small muted">{formatWhen(h.at)}</span>
                <span>{actionLabel(h.action)}{h.details?.to ? `: ${membershipLabel(h.details.to) || h.details.to}` : h.details?.status ? `: ${h.details.status}` : ""}{h.details?.template ? ` (${h.details.template})` : ""}</span>
                <span className="small muted">{h.actor_email}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="small muted">Changes made from now on are listed here.</p>
        )}
      </section>
    </>
  );
}
