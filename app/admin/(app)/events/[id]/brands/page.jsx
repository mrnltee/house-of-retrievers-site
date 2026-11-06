import GreetingFields from "../../../supporters/GreetingFields";
import { recipientFields } from "../../../../../lib/letters.mjs";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { can } from "../../../../../lib/admin/roles.mjs";
import { GIVES } from "../../../../../lib/supporters.mjs";
import { REPLIES, ROLES, replyLabel, sortTracker, trackerCounts, trackerSort } from "../../../../../lib/eventBrands.mjs";
import { trackerRows } from "../../../../../lib/eventBrandsStore";
import { refreshSends, sendsFor } from "../../../../../lib/letterSendsStore";
import { groupLetters, listLetters } from "../../../../../lib/letterStore";
import { letterFor } from "../../../../../lib/contacts.mjs";
import { inviteToEvent, removeTrackerEntry, saveTrackerEntry } from "../../../../eventBrandActions";
import { Flash, NotAllowed, PageHead, formatDay } from "../../../ui";
import { Avatar } from "../../../ImageField";
import ConfirmButton from "../../../ConfirmButton";
import SendStatus from "../../../SendStatus";
import SelectionBar from "./SelectionBar";
import TrackerTools from "./TrackerTools";
import SelectAll from "./SelectAll";
import InviteDialog from "./InviteDialog";

const peso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;
const replyTone = { yes: "good", no: "alert", waiting: "" };

function giving(r) {
  const kinds = (r.gives || []).map((g) => GIVES.find(([k]) => k === g)?.[1]).filter(Boolean);
  return [kinds.join(", "), r.cash_amount != null && `${peso(r.cash_amount)} cash`, r.in_kind_value != null && `${peso(r.in_kind_value)} in kind`, r.in_kind_note].filter(Boolean).join(" · ");
}

/**
 * Brand tracker (owner, 2026-11-01): the brands invited to one event, their
 * invite letter and its email status, their reply and what they give, for this
 * event only. Brands come from Brands & Partners (the directory).
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
    sql("SELECT id, name, kind, logo, contact_email FROM supporters ORDER BY lower(name)"),
    listLetters(),
    groupLetters(),
  ]);
  const refs = rows.map((r) => `supporter:${r.supporter_id}`);
  await refreshSends(refs);
  const sends = await sendsFor(refs, { eventId: event.id });
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  // This event's own letter first (its Letters page), else the usual Sponsors letter.
  const letter = letters.find((l) => l.eventId === event.id)?.key || letterFor("sponsor", chosen);
  const invited = new Set(rows.map((r) => r.supporter_id));
  const notInvited = directory.filter((d) => !invited.has(d.id));
  const counts = trackerCounts(rows);
  const sendsOf = (r) => sends[`supporter:${r.supporter_id}`] || [];
  const lastSent = (r) => sendsOf(r).reduce((max, x) => (!max || new Date(x.sent_at) > new Date(max) ? x.sent_at : max), null);
  const sort = trackerSort(query?.sort || (await cookies()).get("tracker_sort")?.value);
  const sorted = sortTracker(rows, sort, lastSent);
  // Words the tracker search looks through for each row.
  const searchText = (r) => [r.name, r.role, r.contact_name, r.contact_email, recipientFields({ supporter: r }).salutation, replyLabel(r.reply), giving(r), ...sendsOf(r).slice(0, 1).flatMap((x) => [letterName(x.letter_key), x.status])].filter(Boolean).join(" ");

  return (
    <>
      <p className="small"><a href={`${base}/events/${event.id}`}>← {event.title}</a></p>
      <PageHead title="Brand tracker" lead={`${event.date ? formatDay(event.date) : "Date to be set"} · who you invited, their reply and what they're giving.`}>
        <a className="btn ghost" href={`${base}/supporters`}>Brand directory</a>
        {can(admin, "letters:view") && <a className="btn ghost" href={`${base}/events/${event.id}/letters`}>Letters</a>}
        {canEdit && (
          <InviteDialog>
            {notInvited.length === 0 ? (
              <p className="small muted">Every brand in the directory is already on this tracker. <a href={`${base}/supporters/new`}>Add a brand</a>.</p>
            ) : (
              <form action={inviteToEvent} className="form">
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
          </InviteDialog>
        )}
      </PageHead>
      <Flash params={query} />

      <section className="card tracker-page">
        <form id="tracker-send" method="get" action={`${base}/letters/send`}>
          <input type="hidden" name="letter" value={letter} />
          <input type="hidden" name="event" value={event.id} />
        </form>
        {rows.length > 0 && <TrackerTools publicNote="Only brands that said Yes show on this event’s page and on the home page." counts={{ ...counts, unsent: rows.filter((r) => sendsOf(r).length === 0).length }} sort={sort} />}
        {canSend && rows.length > 0 && <SelectionBar letterHref={`${base}/letters/${letter}`} letterName={letterName(letter)} ownLetterHref={`${base}/events/${event.id}/letters`} />}
        <div className="table-wrap tracker-table">
          <table>
            <thead><tr>{canSend && <th>{rows.length > 0 ? <SelectAll /> : <span className="sr-only">Pick</span>}</th>}<th>Brand</th><th>Contact</th><th>Invite letter</th><th>Their reply</th><th>Giving</th></tr></thead>
            <tbody id="tracker-rows">
              {sorted.map((r) => (
                <tr key={r.supporter_id} data-row="" data-reply={r.reply} data-sent={sendsOf(r).length ? "yes" : "no"} data-search={searchText(r)}>
                  {canSend && <td><input type="checkbox" form="tracker-send" name="to" value={`supporter:${r.supporter_id}`} aria-label={`Pick ${r.name}`} /></td>}
                  <td className="strong">
                    <span className="row-name"><Avatar logo={r.logo} name={r.name} /><span><a href={`${base}/supporters/${r.supporter_id}`}>{r.name}</a><br /><span className="small muted">as {r.role}</span></span></span>
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
                          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                            <legend>Greeting <small className="muted">For this brand&apos;s letters at every event</small></legend>
                            <GreetingFields row={r} />
                          </fieldset>
                          <div className="actions">
                            <ConfirmButton className="btn dark" title={`Save ${r.name} for this event?`} items={["Updates their reply and giving for this event only.", "A Yes shows them on this event's page and the home page."]}>Save</ConfirmButton>
                            <ConfirmButton className="btn ghost" formAction={removeTrackerEntry} tone="alert" title={`Take ${r.name} off this event?`} items={["They stay in the brand directory.", "Their letters for this event stay in the log."]}>Remove from this event</ConfirmButton>
                          </div>
                        </form>
                      </details>
                    )}
                  </td>
                  <td>{r.contact_name || "—"}<br /><span className="small muted">{r.contact_email || "No email yet"}</span><br /><span className="small muted">Dear {recipientFields({ supporter: r }).salutation},</span></td>
                  <td className="small"><SendStatus sends={sendsOf(r)} letterName={letterName} usual={letter} /></td>
                  <td><span className={`chip ${replyTone[r.reply]}`.trim()}>{replyLabel(r.reply)}</span>{r.reply === "waiting" && r.follow_up_on && <><br /><span className="small muted">Follow up {formatDay(r.follow_up_on)}</span></>}</td>
                  <td className="small">{giving(r) || "—"}{(r.reps_attending || r.dogs_attending) ? <><br /><span className="muted">{[r.reps_attending && `${r.reps_attending} people`, r.dogs_attending && `${r.dogs_attending} dogs`].filter(Boolean).join(", ")} coming</span></> : null}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={canSend ? 6 : 5} className="muted">No brands invited yet.{canEdit && " Use + Invite brands at the top."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
