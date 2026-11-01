import { notFound } from "next/navigation";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { can } from "../../../../../lib/admin/roles.mjs";
import { GIVES } from "../../../../../lib/supporters.mjs";
import { REPLIES, ROLES, replyLabel, trackerCounts } from "../../../../../lib/eventBrands.mjs";
import { trackerRows } from "../../../../../lib/eventBrandsStore";
import { refreshSends, sendsFor } from "../../../../../lib/letterSendsStore";
import { groupLetters, listLetters } from "../../../../../lib/letterStore";
import { letterFor } from "../../../../../lib/contacts.mjs";
import { inviteToEvent, removeTrackerEntry, saveTrackerEntry } from "../../../../eventBrandActions";
import { Flash, NotAllowed, PageHead, formatDay } from "../../../ui";
import { Avatar } from "../../../ImageField";
import ConfirmButton from "../../../ConfirmButton";
import SendStatus from "../../../SendStatus";
import TickedSubmit from "../../../TickedSubmit";

const peso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;
const replyTone = { yes: "good", no: "alert", waiting: "" };

function giving(r) {
  const kinds = (r.gives || []).map((g) => GIVES.find(([k]) => k === g)?.[1]).filter(Boolean);
  return [kinds.join(", "), r.cash_amount != null && `${peso(r.cash_amount)} cash`, r.in_kind_value != null && `${peso(r.in_kind_value)} in kind`, r.in_kind_note].filter(Boolean).join(" · ");
}

/**
 * Brand tracker (owner, 2026-11-01): the brands invited to one event, their
 * invite letter and its email status, their reply and what they give, for this
 * event only. Brands come from Sponsors & partners (the directory).
 */
export default async function BrandTrackerPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("events:view");
  if (!allowed || !can(admin, "supporters:view")) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [event] = await sql("SELECT id, title, date, status FROM events WHERE id = $1", [id]);
  if (!event) notFound();
  const base = await adminBase();
  const canEdit = can(admin, "supporters:edit");
  const canSend = can(admin, "letters:edit");
  const [rows, directory, letters, chosen] = await Promise.all([
    trackerRows(event.id),
    sql("SELECT id, name, kind, logo, contact_email FROM supporters WHERE deleted_at IS NULL ORDER BY lower(name)"),
    listLetters(),
    groupLetters(),
  ]);
  const refs = rows.map((r) => `supporter:${r.supporter_id}`);
  await refreshSends(refs);
  const sends = await sendsFor(refs, { eventId: event.id });
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  const letter = letterFor("sponsor", chosen);
  const invited = new Set(rows.map((r) => r.supporter_id));
  const notInvited = directory.filter((d) => !invited.has(d.id));
  const counts = trackerCounts(rows);

  return (
    <>
      <PageHead title="Brand tracker" lead={`${event.title} · ${event.date ? formatDay(event.date) : "date to be set"}. Brands invited to this event only: their invite letter, their reply and what they're giving.`}>
        <a className="btn ghost" href={`${base}/events/${event.id}`}>Back to the event</a>
        <a className="btn ghost" href={`${base}/supporters`}>Brand directory</a>
      </PageHead>
      <Flash params={query} />

      <section className="card tracker-summary">
        <span className="chip">{counts.invited} invited</span>
        <span className="chip good">{counts.yes} said yes</span>
        <span className="chip alert">{counts.no} said no</span>
        <span className="chip">{counts.waiting} no reply yet</span>
        <p className="small muted" style={{ flexBasis: "100%", margin: "6px 0 0" }}>Only brands that said <strong>Yes</strong> show on this event&apos;s page and on the home page.</p>
      </section>

      {canEdit && (
        <details className="card" open={rows.length === 0}>
          <summary className="strong">+ Invite brands</summary>
          {notInvited.length === 0 ? (
            <p className="small muted" style={{ marginTop: 10 }}>Every brand in the directory is already on this tracker. <a href={`${base}/supporters/new`}>Add a brand</a>.</p>
          ) : (
            <form action={inviteToEvent} className="form" style={{ marginTop: 12 }}>
              <input type="hidden" name="event" value={event.id} />
              <p className="small muted" style={{ margin: 0 }}>Tick the brands to invite. This only adds them here; nothing is emailed until you send a letter.</p>
              <ul className="tracker-pick">
                {notInvited.map((d) => (
                  <li key={d.id}><label className="check"><input type="checkbox" name="brand" value={d.id} /> <Avatar logo={d.logo} name={d.name} /> <span>{d.name} <span className="small muted">· usually {d.kind}{d.contact_email ? "" : " · no email yet"}</span></span></label></li>
                ))}
              </ul>
              <div className="actions"><ConfirmButton className="btn dark" title="Add these brands to this event?" items={["They show on this tracker as No reply yet.", "Nothing is emailed."]}>Add to this event</ConfirmButton></div>
            </form>
          )}
        </details>
      )}

      <section className="card">
        <form id="tracker-send" method="get" action={`${base}/letters/send`}>
          <input type="hidden" name="letter" value={letter} />
          <input type="hidden" name="event" value={event.id} />
          <div className="actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>Invited brands <span className="muted small">({rows.length})</span></h2>
              <p className="small muted" style={{ margin: "4px 0 0" }}>Letter: <a href={`${base}/letters/${letter}`}>{letterName(letter)}</a>. You can pick another letter on the next page.</p>
            </div>
            {canSend && rows.length > 0 && <TickedSubmit />}
          </div>
        </form>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table>
            <thead><tr>{canSend && <th><span className="sr-only">Pick</span></th>}<th>Brand</th><th>Contact</th><th>Invite letter</th><th>Their reply</th><th>Giving</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.supporter_id}>
                  {canSend && <td><input type="checkbox" form="tracker-send" name="to" value={`supporter:${r.supporter_id}`} aria-label={`Pick ${r.name}`} /></td>}
                  <td className="strong">
                    <span className="row-name"><Avatar logo={r.logo} name={r.name} /><span><a href={`${base}/supporters/${r.supporter_id}`}>{r.name}</a><br /><span className="small muted">as {r.role}{r.deleted_at ? " · Removed from directory" : ""}</span></span></span>
                    {canEdit && (
                      <details className="tracker-edit">
                        <summary className="small">Edit</summary>
                        <form action={saveTrackerEntry} className="form">
                          <input type="hidden" name="event" value={event.id} />
                          <input type="hidden" name="brand" value={r.supporter_id} />
                          <div className="row-3">
                            <label className="field"><span>Their reply</span><select name="reply" defaultValue={r.reply}>{REPLIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                            <label className="field"><span>At this event as</span><select name="role" defaultValue={r.role}>{ROLES.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
                            <label className="field"><span>Follow up on</span><input type="date" name="followUpOn" defaultValue={r.follow_up_on || ""} /></label>
                          </div>
                          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                            <legend>Giving</legend>
                            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>{GIVES.map(([k, l]) => <label key={k} className="check"><input type="checkbox" name="gives" value={k} defaultChecked={(r.gives || []).includes(k)} /> {l}</label>)}</div>
                          </fieldset>
                          <div className="row-3">
                            <label className="field"><span>Cash (₱)</span><input type="text" inputMode="numeric" name="cashAmount" defaultValue={r.cash_amount ?? ""} /></label>
                            <label className="field"><span>In-kind value (₱)</span><input type="text" inputMode="numeric" name="inKindValue" defaultValue={r.in_kind_value ?? ""} /></label>
                            <label className="field"><span>In-kind items</span><input type="text" name="inKindNote" maxLength={300} defaultValue={r.in_kind_note || ""} /></label>
                          </div>
                          <label className="check"><input type="checkbox" name="showAmounts" defaultChecked={r.show_amounts} /> <span>OK to show these amounts on the website</span></label>
                          <div className="row-3">
                            <label className="field"><span>People coming</span><input type="number" name="repsAttending" min={0} max={500} defaultValue={r.reps_attending ?? ""} /></label>
                            <label className="field"><span>Dogs coming</span><input type="number" name="dogsAttending" min={0} max={500} defaultValue={r.dogs_attending ?? ""} /></label>
                          </div>
                          <label className="field"><span>Booth requirements <small>Table, power, space…</small></span><textarea name="boothNeeds" rows={2} maxLength={500} defaultValue={r.booth_needs || ""} /></label>
                          <label className="field"><span>Notes <small>Only admins see these</small></span><textarea name="notes" rows={2} maxLength={2000} defaultValue={r.notes || ""} /></label>
                          <div className="actions">
                            <ConfirmButton className="btn dark" title={`Save ${r.name} for this event?`} items={["Updates their reply and giving for this event only.", "A Yes shows them on this event's page and the home page."]}>Save</ConfirmButton>
                            <ConfirmButton className="btn ghost" formAction={removeTrackerEntry} tone="alert" title={`Take ${r.name} off this event?`} items={["They stay in the brand directory.", "Their letters for this event stay in the log."]}>Remove from this event</ConfirmButton>
                          </div>
                        </form>
                      </details>
                    )}
                  </td>
                  <td>{r.contact_name || "—"}<br /><span className="small muted">{r.contact_email || "No email yet"}</span></td>
                  <td className="small"><SendStatus sends={sends[`supporter:${r.supporter_id}`]} letterName={letterName} /></td>
                  <td><span className={`chip ${replyTone[r.reply]}`.trim()}>{replyLabel(r.reply)}</span>{r.reply === "waiting" && r.follow_up_on && <><br /><span className="small muted">Follow up {formatDay(r.follow_up_on)}</span></>}</td>
                  <td className="small">{giving(r) || "—"}{(r.reps_attending || r.dogs_attending) ? <><br /><span className="muted">{[r.reps_attending && `${r.reps_attending} people`, r.dogs_attending && `${r.dogs_attending} dogs`].filter(Boolean).join(", ")} coming</span></> : null}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={canSend ? 6 : 5} className="muted">No brands invited yet.{canEdit && " Use + Invite brands above."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
