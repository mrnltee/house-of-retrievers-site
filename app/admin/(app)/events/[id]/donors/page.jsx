import { notFound } from "next/navigation";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { can } from "../../../../../lib/admin/roles.mjs";
import { CONTACT_CATEGORIES, letterEmails } from "../../../../../lib/contacts.mjs";
import { ASKED_VIA, DONATION_METHODS, DONOR_LIMITS, DONOR_STATUSES, donorCounts, labelOf } from "../../../../../lib/eventDonors.mjs";
import { formatPeso } from "../../../../../lib/prices.mjs";
import { listLetters } from "../../../../../lib/letterStore";
import { refreshSends, sendsFor } from "../../../../../lib/letterSendsStore";
import { addGuestsToEvent, removeEventDonor, saveContact, saveEventDonor } from "../../../../contactActions";
import { Flash, NotAllowed, PageHead, formatDay } from "../../../ui";
import { Avatar } from "../../../ImageField";
import ConfirmButton from "../../../ConfirmButton";
import SendStatus from "../../../SendStatus";
import TickedSubmit from "../../../TickedSubmit";
import ContactFields from "../../../guests/ContactFields";

const statusTone = { asked: "", pledged: "", received: "good", receipt_sent: "good", declined: "alert" };
const DONATION_LETTER = "donation-letter";

/**
 * An event's donor list (owner, 2026-11-02): who HOR asked for a cash donation
 * for this event (email letter or IG/FB DM), what they pledged or gave, and what
 * their official receipt and public thanks need. Admin-only; nothing is public.
 */
export default async function EventDonorsPage({ params, searchParams }) {
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
  const [donors, others, letters] = await Promise.all([
    sql(`SELECT c.*, ed.status, ed.asked_via, ed.amount, ed.method, ed.received_on, ed.reference, ed.receipt_name, ed.receipt_address,
                ed.acknowledge, ed.public_name, ed.notes AS event_notes
           FROM event_donors ed JOIN letter_contacts c ON c.id = ed.contact_id
          WHERE ed.event_id = $1 AND c.deleted_at IS NULL ORDER BY lower(c.name)`, [event.id]),
    sql(`SELECT id, name, organization, category, email FROM letter_contacts c WHERE deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM event_donors ed WHERE ed.event_id = $1 AND ed.contact_id = c.id)
          ORDER BY (category <> 'donor'), lower(name)`, [event.id]),
    listLetters(),
  ]);
  const refs = donors.map((d) => `contact:${d.id}`);
  await refreshSends(refs);
  const sends = await sendsFor(refs, { eventId: event.id });
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  const counts = donorCounts(donors);
  const peso = (n) => formatPeso(Number(n) || 0);
  const otherGroups = CONTACT_CATEGORIES.map((c) => ({ ...c, rows: others.filter((o) => o.category === c.key) }))
    .filter((g) => g.rows.length).sort((a, b) => (a.key === "donor" ? -1 : b.key === "donor" ? 1 : 0));

  return (
    <>
      <PageHead title="Donors" lead={`${event.title} · ${event.date ? formatDay(event.date) : "date to be set"}. Who you asked for a cash donation for this event, what they pledged or gave, and their receipt. Only admins see this.`}>
        <a className="btn ghost" href={`${base}/events/${event.id}`}>Back to the event</a>
        <a className="btn ghost" href={`${base}/letters/open-donation-letter`}>Open letter for DMs</a>
      </PageHead>
      <Flash params={query} />

      <section className="card tracker-summary">
        <span className="chip">{counts.donors} on the list</span>
        <span className="chip good">{peso(counts.received)} received ({counts.gave})</span>
        <span className="chip">{peso(counts.pledged)} pledged, not in yet</span>
        <span className={`chip ${counts.receiptsDue ? "alert" : ""}`.trim()}>{counts.receiptsDue} receipt{counts.receiptsDue === 1 ? "" : "s"} to send</span>
        <span className="chip">{counts.asked} no answer yet</span>
      </section>

      {canEdit && (
        <details className="card" open={donors.length === 0}>
          <summary className="strong">+ Add a donor</summary>
          <form action={saveContact} className="form" style={{ marginTop: 12 }}>
            <input type="hidden" name="event" value={event.id} />
            <input type="hidden" name="list" value="donors" />
            <ContactFields category="donor" />
            <div className="actions"><ConfirmButton className="btn dark" title="Add to this event's donor list?" items={["They show as Asked, ready for a letter or a DM.", "Nothing is emailed."]}>Add to the donor list</ConfirmButton></div>
          </form>
        </details>
      )}

      {canEdit && otherGroups.length > 0 && (
        <details className="card">
          <summary className="strong">+ Add from your guests and earlier donors <span className="muted small">({others.length})</span></summary>
          <form action={addGuestsToEvent} className="form" style={{ marginTop: 12 }}>
            <input type="hidden" name="event" value={event.id} />
            <input type="hidden" name="list" value="donors" />
            <p className="small muted" style={{ margin: 0 }}>Cash donors first, then everyone else in your guests. Tick who you&apos;re asking for this event; nothing is emailed.</p>
            {otherGroups.map((c) => (
              <fieldset key={c.key} className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="strong">{c.label}</legend>
                <ul className="tracker-pick">
                  {c.rows.map((o) => (
                    <li key={o.id}><label className="check"><input type="checkbox" name="contact" value={o.id} /> <span>{o.name}{o.organization ? <span className="small muted"> · {o.organization}</span> : null}{!o.email && <span className="small muted"> · no email yet</span>}</span></label></li>
                  ))}
                </ul>
              </fieldset>
            ))}
            <div className="actions"><ConfirmButton className="btn dark" title="Add them to this event's donors?" items={["They show as Asked.", "Nothing is emailed."]}>Add to this event</ConfirmButton></div>
          </form>
        </details>
      )}

      {donors.length === 0 ? <p className="card muted">No donors on this event yet.{canEdit && " Use + Add a donor above."}</p> : (
        <section className="card">
          <form id="send-donors" method="get" action={`${base}/letters/send`}>
            <input type="hidden" name="letter" value={DONATION_LETTER} />
            <input type="hidden" name="event" value={event.id} />
            <input type="hidden" name="list" value="donors" />
            <div className="actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>Donors <span className="muted small">({donors.length})</span></h2>
                <p className="small muted" style={{ margin: "4px 0 0" }}>Email letter: <a href={`${base}/letters/${DONATION_LETTER}`}>{letterName(DONATION_LETTER)}</a>. For a DM, use the <a href={`${base}/letters/open-donation-letter`}>open letter</a> and set &quot;Asked by&quot; below.</p>
              </div>
              {canSend && <TickedSubmit />}
            </div>
          </form>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead><tr>{canSend && <th><span className="sr-only">Pick</span></th>}<th>Donor</th><th>Asked by</th><th>Status</th><th>Amount</th><th>Receipt &amp; thanks</th></tr></thead>
              <tbody>
                {donors.map((r) => (
                  <tr key={r.id}>
                    {canSend && <td><input type="checkbox" form="send-donors" name="to" value={`contact:${r.id}`} aria-label={`Pick ${r.name}`} /></td>}
                    <td className="strong">
                      <span className="row-name"><Avatar photo={r.photo} logo={r.logo} name={r.name} /><span><a href={`${base}/guests/${r.id}?event=${event.id}`}>{r.name}</a>{(letterEmails(r).to || r.handle) && <><br /><span className="small muted">{[letterEmails(r).to, r.handle].filter(Boolean).join(" · ")}</span></>}</span></span>
                      {canEdit && (
                        <details className="tracker-edit">
                          <summary className="small">Donation details</summary>
                          <form action={saveEventDonor} className="form">
                            <input type="hidden" name="event" value={event.id} />
                            <input type="hidden" name="contact" value={r.id} />
                            <div className="row-2">
                              <label className="field"><span>Status</span><select name="status" defaultValue={r.status}>{DONOR_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                              <label className="field"><span>Asked by</span><select name="askedVia" defaultValue={r.asked_via}>{ASKED_VIA.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                            </div>
                            <div className="row-3">
                              <label className="field"><span>Amount (₱) <small>Pledged or received</small></span><input name="amount" inputMode="numeric" defaultValue={r.amount ?? ""} placeholder="5000" /></label>
                              <label className="field"><span>Method</span><select name="method" defaultValue={r.method || ""}><option value="">—</option>{DONATION_METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                              <label className="field"><span>Date received</span><input name="receivedOn" type="date" defaultValue={r.received_on || ""} /></label>
                            </div>
                            <label className="field"><span>Reference no. <small>Bank or GCash reference, cheque no.</small></span><input name="reference" maxLength={DONOR_LIMITS.reference} defaultValue={r.reference || ""} /></label>
                            <div className="row-2">
                              <label className="field"><span>Name on the receipt</span><input name="receiptName" maxLength={DONOR_LIMITS.receiptName} defaultValue={r.receipt_name || ""} /></label>
                              <label className="field"><span>Receipt mailing address</span><input name="receiptAddress" maxLength={DONOR_LIMITS.receiptAddress} defaultValue={r.receipt_address || ""} /></label>
                            </div>
                            <div className="row-2">
                              <label className="field"><span>Thanks</span><select name="acknowledge" defaultValue={r.acknowledge}><option value="private">Keep their name private</option><option value="public">Thank them publicly</option></select></label>
                              <label className="field"><span>Name to publish <small>If thanked publicly</small></span><input name="publicName" maxLength={DONOR_LIMITS.publicName} defaultValue={r.public_name || ""} /></label>
                            </div>
                            <label className="field"><span>Notes <small>Only admins see these</small></span><textarea name="notes" rows={2} maxLength={DONOR_LIMITS.notes} defaultValue={r.event_notes || ""} /></label>
                            <div className="actions">
                              <ConfirmButton className="btn dark" title={`Save ${r.name}'s donation?`} items={["For this event only.", "Nothing is emailed."]}>Save</ConfirmButton>
                              <ConfirmButton className="btn ghost" formAction={removeEventDonor} tone="alert" title={`Take ${r.name} off this event's donors?`} items={["They stay in your guests for other events.", "Letters already sent stay in the log."]}>Remove from this event</ConfirmButton>
                            </div>
                          </form>
                        </details>
                      )}
                    </td>
                    <td className="small">{labelOf(ASKED_VIA, r.asked_via)}{r.asked_via === "email" && <><br /><SendStatus sends={sends[`contact:${r.id}`]} letterName={letterName} /></>}</td>
                    <td><span className={`chip ${statusTone[r.status] || ""}`.trim()}>{labelOf(DONOR_STATUSES, r.status)}</span></td>
                    <td className="small">{r.amount != null ? <strong>{peso(r.amount)}</strong> : <span className="muted">—</span>}{r.method && <><br />{labelOf(DONATION_METHODS, r.method)}</>}{r.received_on && <><br /><span className="muted">{formatDay(r.received_on)}</span></>}{r.reference && <><br /><span className="muted">Ref {r.reference}</span></>}</td>
                    <td className="small">{r.receipt_name || <span className="muted">No receipt name yet</span>}{r.receipt_address && <><br /><span className="muted">{r.receipt_address}</span></>}<br />{r.acknowledge === "public" ? <>Thank publicly as <strong>{r.public_name}</strong></> : <span className="muted">Name kept private</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
