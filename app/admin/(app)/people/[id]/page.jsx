import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { actionLabel } from "../../../../lib/admin/activity.mjs";
import { MEMBERSHIP, NUMBER_PREFIX, PEOPLE_STATUSES, hasMembership, memberNumber, membershipFor, membershipLabel } from "../../../../lib/admin/people.mjs";
import { supporterNumber } from "../../../../lib/supporters.mjs";
import { FEE_STATUS } from "../../../../lib/eventPayments.mjs";
import { listCustomTemplates } from "../../../../lib/emailSettings";
import SendTemplate from "../SendTemplate";
import { emailReady } from "../../../../lib/email";
import { resendWelcome, sendTemplateToPerson, updateMembership, updatePerson } from "../../../actions";
import { supporterFromPerson } from "../../../supporterActions";
import { Flash, NotAllowed, PageHead, formatWhen, isoDate } from "../../ui";
import PersonAvatar from "../PersonAvatar";
import PersonPhotoField from "../PersonPhotoField";
import ConfirmMembership from "../ConfirmMembership";
import ConfirmButton from "../../ConfirmButton";
import FurbabyList from "../../registrations/FurbabyList";
import { livingFurbabyNames, splitFurbabyNames } from "../../../../lib/attendeeNames.mjs";
import BreedFields from "../../registrations/BreedFields";
import { updatePersonDetails } from "../../../actions";

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
        WHERE lower(r.email) = lower($1) AND r.deleted_at IS NULL ORDER BY e.date DESC LIMIT 50`,
      [person.email],
    ),
    sql("SELECT at, actor_email, action, details FROM activity_log WHERE details->>'personId' = $1 ORDER BY at DESC LIMIT 50", [id]),
    sql("SELECT id, kind FROM people WHERE lower(email) = lower($1) AND id <> $2", [person.email, id]),
  ]);
  const supporter = ["Sponsor", "Partner"].includes(person.kind)
    ? (await sql("SELECT id, name, code, number_year, number_no FROM supporters WHERE person_id = $1 OR lower(name) = lower($2) LIMIT 1", [id, (person.organization || person.name || "").trim()]))[0] || null
    : null;
  const acceptance = await listCustomTemplates("acceptance");
  const canEdit = can(admin.roles, "people:edit");
  const member = hasMembership(person.kind);
  const noun = person.kind === "Volunteer" ? "volunteer" : "member";
  const number = member ? memberNumber(person) : supporterNumber(supporter);
  const attended = events.filter((e) => e.checked_in_at).length;
  const lastSeen = events.find((e) => e.checked_in_at);
  const ready = emailReady();

  return (
    <>
      <p className="small"><a href={`${base}/people?kind=${person.kind}`}>← {person.kind}s</a></p>
      <div className="person-head">
        <PersonAvatar person={person} base={base} size={96} />
        <div>
          {canEdit && <PersonPhotoField personId={person.id} current={Boolean(person.photo_id)} name={person.name} />}
          <PageHead title={person.name} lead={[person.kind, number, member ? membershipLabel(person.membership) : person.status].filter(Boolean).join(" · ")} />
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
            {(person.furbaby_name || person.furbaby_breeds?.some(Boolean)) && <div><dt>{splitFurbabyNames(person.furbaby_name).length > 1 || (person.furbaby_breeds || []).length > 1 ? "Furbabies" : "Furbaby"}</dt><dd><FurbabyList names={person.furbaby_name} breeds={person.furbaby_breeds} rainbow={person.furbaby_rainbow} size={24} /></dd></div>}
            <div><dt>Joined</dt><dd>{formatWhen(person.created_at)}{person.joined_count > 1 && <> · sent the form {person.joined_count} times, last {formatWhen(person.last_joined_at)}</>}</dd></div>
            {others.length > 0 && <div><dt>Also</dt><dd>{others.map((o) => <a key={o.id} href={`${base}/people/${o.id}`} className="chip" style={{ marginRight: 6 }}>{o.kind}</a>)}</dd></div>}
          </dl>
          {!person.photo_id && <p className="small muted">No photo yet. Use “Add a photo” at the top. Photos sent with the Join form before 11 Oct 2026 are in the "HOR Member photos" Drive folder, linked from the sheet.</p>}
          {canEdit && (
            <details className="disclosure-card person-edit">
              <summary><h3>Edit details</h3></summary>
              <form action={updatePersonDetails} className="form" style={{ gap: 12, marginTop: 12 }}>
                <input type="hidden" name="id" value={person.id} />
                <label className="field"><span>Name</span><input name="name" required maxLength={120} defaultValue={person.name} /></label>
                <label className="field"><span>Email <small>Can't be changed here: it's how their Join form and events find this record</small></span><input value={person.email} readOnly disabled /></label>
                <div className="row-2">
                  <label className="field"><span>Social profile <small>Handle or link; empty to remove</small></span><input name="socialProfile" maxLength={300} defaultValue={person.social_url || person.social_profile || ""} /></label>
                  <label className="field"><span>On</span><select name="socialPlatform" defaultValue={/facebook/i.test(person.social_url || "") ? "Facebook" : "Instagram"}><option>Instagram</option><option>Facebook</option></select></label>
                </div>
                {(person.kind === "Partner" || person.kind === "Sponsor" || person.organization) && <label className="field"><span>Organization</span><input name="organization" maxLength={160} defaultValue={person.organization || ""} /></label>}
                <div className="row-2">
                  <label className="field"><span>Furbaby names <small>Optional. Separate with commas, e.g. Khalee, Audrey</small></span><input name="furbabyName" maxLength={120} defaultValue={person.furbaby_name || ""} /></label>
                  <label className="field"><span>Furbabies</span><input name="furbabyCount" type="number" min={0} max={10} defaultValue={Math.max(splitFurbabyNames(person.furbaby_name).length, (person.furbaby_breeds || []).length, person.furbaby_name ? 1 : 0)} /></label>
                </div>
                <BreedFields initial={person.furbaby_breeds || []} rainbow={person.furbaby_rainbow || []} showRainbow count={Math.max(splitFurbabyNames(person.furbaby_name).length, (person.furbaby_breeds || []).length, person.furbaby_name ? 1 : 0)} />
                <div className="actions"><ConfirmButton title={`Save ${person.name}'s details?`} items={["Their name, social profile, furbaby and breed are updated", "Their email, membership, number and history stay the same", "Nothing is emailed"]} yes="Yes, save details">Save details</ConfirmButton></div>
              </form>
            </details>
          )}
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
              <h2>{person.kind === "Volunteer" ? "Volunteer status" : "Membership"}</h2>
              <dl className="facts">
                <div><dt>Status</dt><dd><span className={`chip membership-${person.membership}`}>{membershipLabel(person.membership)}</span></dd></div>
                {person.member_no && <div><dt>Number</dt><dd>{memberNumber(person)}</dd></div>}
                {person.member_since && <div><dt>Since</dt><dd>{isoDate(person.member_since)}</dd></div>}
              </dl>
              {canEdit && (
                <form action={updateMembership} className="form" style={{ gap: 12 }}>
                  <input type="hidden" name="id" value={person.id} />
                  <ConfirmMembership
                    name={person.name}
                    email={person.email}
                    current={person.membership}
                    labels={Object.fromEntries(MEMBERSHIP.map(([k, l]) => [k, l]))}
                    hasNumber={Boolean(person.member_no)}
                    year={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric" }).format(new Date(person.created_at))}
                    prefix={NUMBER_PREFIX[person.kind]}
                    noun={noun}
                  />
                  <fieldset className="plain">
                    <legend>Change to</legend>
                    {membershipFor(person.kind).map(([key, label, hint]) => (
                      <label key={key} className="check"><input type="radio" name="membership" value={key} defaultChecked={person.membership === key} /> <span><strong>{label}</strong> <span className="small muted">{hint}</span></span></label>
                    ))}
                  </fieldset>
                  {!person.member_no && (
                    <label className="field">
                      <span>Email when they become Active {!ready && <small>Switches on once the Resend key is in Vercel</small>}</span>
                      <select name="welcome" defaultValue={ready ? "standard" : "none"} disabled={!ready}>
                        <option value="standard">Standard welcome ({person.kind === "Volunteer" ? "Welcome, volunteer" : "Welcome to the pack"})</option>
                        {acceptance.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        <option value="none">Don't send an email</option>
                      </select>
                    </label>
                  )}
                  <div className="actions"><button className="btn gold" data-confirm="membership">Save membership</button></div>
                </form>
              )}
              {canEdit && person.membership === "active" && ready && (
                <form action={resendWelcome} style={{ marginTop: 8 }}>
                  <input type="hidden" name="id" value={person.id} />
                  <ConfirmButton
                    className="linkish"
                    title={`Send ${person.name}'s welcome email again?`}
                    items={[`The welcome email is sent to ${person.email}`, "Their membership status and number stay unchanged"]}
                    yes="Yes, send it again"
                    tone="ghost"
                  >Send the welcome email again</ConfirmButton>
                </form>
              )}
            </section>
          )}

          {["Sponsor", "Partner"].includes(person.kind) && (
            <section className="card">
              <h2>Sponsor & partner record</h2>
              {supporter ? (
                <>
                  {number ? <dl className="facts"><div><dt>Number</dt><dd>{number}</dd></div></dl> : <p className="small muted">Gets a number (HOR-{supporter.code || "XXXX"}-YY-NNNN) once the record is Confirmed.</p>}
                  <p><a href={`${base}/supporters/${supporter.id}`}>Open “{supporter.name}” →</a></p>
                </>
              ) : canEdit ? (
                <form action={supporterFromPerson}>
                  <input type="hidden" name="personId" value={person.id} />
                  <p className="small muted">Make a record for logo, tier, amounts and the events they back. It appears on the website only once it's confirmed and switched on.</p>
                  <ConfirmButton
                    className="btn ghost"
                    title={`Make a ${person.kind.toLowerCase()} record for ${person.name}?`}
                    items={["A supporter record is created from their People details", "It stays off the website until it is complete, Confirmed and switched on"]}
                    yes="Yes, make the record"
                    tone="ghost"
                  >Make a {person.kind.toLowerCase()} record</ConfirmButton>
                </form>
              ) : (
                <p className="small muted">No record yet.</p>
              )}
            </section>
          )}

          {canEdit && (
            <section className="card">
              <h2>Send an email</h2>
              {acceptance.length ? (
                <SendTemplate
                  action={sendTemplateToPerson}
                  personId={person.id}
                  email={person.email}
                  ready={ready}
                  templates={acceptance.map((t) => ({ id: t.id, name: t.name, subject: t.subject, greeting: t.greeting, heading: t.heading, message: t.message }))}
                  person={{ name: person.name, furbaby: livingFurbabyNames(person.furbaby_name, person.furbaby_rainbow), organization: person.organization || "", kind: person.kind, memberNo: number }}
                />
              ) : (
                <p className="small muted">Write an Acceptance template in <a href={`${base}/emails/new?kind=acceptance`}>Email templates</a> to send it from here, e.g. when you accept a volunteer, partner or sponsor.</p>
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
                <div className="actions">
                  <ConfirmButton
                    className="btn ghost"
                    title={`Save follow-up changes for ${person.name}?`}
                    echo={[{ name: "status", label: "Status" }, { name: "notes", label: "Notes" }]}
                    items={["Their People record is updated", "The activity log records the change"]}
                    yes="Yes, save follow-up"
                    tone="ghost"
                  >Save follow-up</ConfirmButton>
                </div>
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
                    <td>{REG_STATUS[e.status] || e.status}{e.fee_status && e.fee_status !== "not_due" ? ` · ${FEE_STATUS[e.fee_status]?.label.toLowerCase() || e.fee_status}` : ""}</td>
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
