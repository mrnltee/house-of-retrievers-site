import { Fragment } from "react";
import { notFound } from "next/navigation";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { can } from "../../../../../lib/admin/roles.mjs";
import { CONTACT_CATEGORIES, letterEmails } from "../../../../../lib/contacts.mjs";
import { ASKED_VIA, DONATION_METHODS, DONOR_COLUMNS, DONOR_LIMITS, DONOR_STATUSES, donationTotals, donorCounts, gaveMoney, labelOf, sameReferences } from "../../../../../lib/eventDonors.mjs";
import { displayName } from "../../../../../lib/admin/profile.mjs";
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
import EditDialog from "../../../EditDialog";
import ListSearch from "../../../ListSearch";
import ColumnPicker from "../../../ColumnPicker";
import DonationFiles from "./DonationFiles";
import FileViewer from "./FileViewer";

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
  const [donors, others, letters, fileRows] = await Promise.all([
    sql(`SELECT c.*, ed.status, ed.asked_via, ed.amount, ed.method, ed.received_on, ed.reference, ed.receipt_name, ed.receipt_address,
                ed.acknowledge, ed.public_name, ed.notes AS event_notes, ed.verified_at, ed.verified_by,
                a.name AS checker_name, a.first_name AS checker_first, a.furbaby_name AS checker_furbaby, a.show_as AS checker_show_as
           FROM event_donors ed JOIN letter_contacts c ON c.id = ed.contact_id
           LEFT JOIN admins a ON lower(a.email) = lower(ed.verified_by)
          WHERE ed.event_id = $1 AND c.deleted_at IS NULL ORDER BY lower(c.name)`, [event.id]),
    sql(`SELECT id, name, organization, category, email FROM letter_contacts c WHERE deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM event_donors ed WHERE ed.event_id = $1 AND ed.contact_id = c.id)
          ORDER BY (category <> 'donor'), lower(name)`, [event.id]),
    listLetters(),
    sql("SELECT id, contact_id, kind, mime, name, size, created_at FROM donation_files WHERE event_id = $1 ORDER BY created_at", [event.id]),
  ]);
  const refs = donors.map((d) => `contact:${d.id}`);
  await refreshSends(refs);
  const sends = await sendsFor(refs, { eventId: event.id });
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  const counts = donorCounts(donors);
  // Donation tracker (owner, 22 Nov 2026): each donor's returned form and proofs of payment, the proceeds,
  // and which donations were checked against HoR's account.
  const filesOf = (contactId, kind) => fileRows.filter((f) => f.contact_id === contactId && f.kind === kind).map((f) => ({ ...f, created_at: String(f.created_at) }));
  const proofCounts = Object.fromEntries(donors.map((d) => [d.id, filesOf(d.id, "proof").length]));
  const totals = donationTotals(donors, proofCounts);
  const sameRef = sameReferences(donors);
  const mayCheck = can(admin, "registrations:fees");
  // "Nov 19" this year, "Nov 19, 2025" otherwise (Manila), so dates don't widen the table.
  const shortDay = (value) => { const d = new Date(String(value).length === 10 ? `${value}T12:00:00+08:00` : value); const year = (x) => x.toLocaleDateString("en-US", { year: "numeric", timeZone: "Asia/Manila" }); return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year(d) === year(new Date()) ? {} : { year: "numeric" }), timeZone: "Asia/Manila" }); };
  const checker = (r) => displayName({ email: r.verified_by, name: r.checker_name, first_name: r.checker_first, furbaby_name: r.checker_furbaby, show_as: r.checker_show_as });
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

      <section className="card donation-proceeds" aria-labelledby="proceeds-title">
        <h2 id="proceeds-title">Proceeds</h2>
        <div className="donation-proceeds-grid">
          <div className="donation-total">
            <span className="small muted">Total received</span>
            <strong>{peso(totals.received)}</strong>
            <span className="small">{totals.receivedCount} donation{totals.receivedCount === 1 ? "" : "s"} marked Received or Receipt sent</span>
          </div>
          <div className="donation-total good">
            <span className="small muted">Checked against HoR&apos;s account</span>
            <strong>{peso(totals.checked)}</strong>
            <span className="small">{totals.checkedCount} with proof, found in HoR&apos;s account history</span>
          </div>
          <div className={`donation-total ${totals.toCheckCount ? "alert" : ""}`.trim()}>
            <span className="small muted">Still to check</span>
            <strong>{peso(totals.toCheck)}</strong>
            <span className="small">{totals.toCheckCount} donation{totals.toCheckCount === 1 ? "" : "s"}{totals.noProofCount ? ` · ${totals.noProofCount} without proof of payment` : ""}</span>
          </div>
          <div className="donation-total">
            <span className="small muted">Pledged, not in yet</span>
            <strong>{peso(totals.pledged)}</strong>
            <span className="small">{totals.pledgedCount} pledge{totals.pledgedCount === 1 ? "" : "s"}</span>
          </div>
        </div>
        {totals.byMethod.length > 0 && (
          <p className="small donation-methods"><span className="muted">Received by method:</span> {totals.byMethod.map((m) => <span key={m.key} className="chip">{m.label} · {peso(m.amount)} ({m.count})</span>)}</p>
        )}
        <p className="small muted" style={{ margin: 0 }}>{counts.donors} on the list · {counts.asked} no answer yet · <span className={counts.receiptsDue ? "danger-text" : ""}>{counts.receiptsDue} receipt{counts.receiptsDue === 1 ? "" : "s"} to send</span> · {counts.declined} declined. Only money marked as checked has been seen in HoR&apos;s account.</p>
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
        <section className="card donor-tracker">
          <form id="send-donors" method="get" action={`${base}/letters/send`}>
            <input type="hidden" name="letter" value={DONATION_LETTER} />
            <input type="hidden" name="event" value={event.id} />
            <input type="hidden" name="list" value="donors" />
          <div className="donor-tracker-head">
            <div>
              <h2 style={{ margin: 0 }}>Donors <span className="muted small">({donors.length})</span></h2>
              <p className="small muted" style={{ margin: "4px 0 0" }}>Email letter: <a href={`${base}/letters/${DONATION_LETTER}`}>{letterName(DONATION_LETTER)}</a>. For a DM, use the <a href={`${base}/letters/open-donation-letter`}>open letter</a>. When a donor sends back their form, open <strong>Edit details</strong> and attach it with their proof of payment: the details fill in from the form.</p>
            </div>
          </div>
          </form>
          <div className="donor-tracker-tools">
            <ListSearch placeholder="Search donor, reference, method, status…" />
            <ColumnPicker table="donor-table" storageKey="hor-columns-donors" columns={DONOR_COLUMNS} />
            {canSend && <div className="donor-send"><TickedSubmit form="send-donors" className="btn dark" /></div>}
          </div>
          <div className="table-wrap">
            <table id="donor-table" className="donor-table">
              <thead>
                <tr>
                  {canSend && <th><span className="sr-only">Pick</span></th>}
                  <th>Donor</th>
                  {DONOR_COLUMNS.map((c) => <th key={c.key} data-col={c.key} className={c.key === "amount" ? "num" : undefined}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {donors.map((r) => {
                  const proofs = filesOf(r.id, "proof");
                  const forms = filesOf(r.id, "form");
                  const gave = gaveMoney(r);
                  const find = [r.name, r.organization, letterEmails(r).to, r.handle, labelOf(DONOR_STATUSES, r.status), labelOf(DONATION_METHODS, r.method), r.reference, r.receipt_name, r.public_name, r.verified_at ? "checked" : gave ? "to check" : "", gave && !proofs.length ? "no proof" : "", forms.length ? "form returned" : ""].filter(Boolean).join(" ").toLowerCase();
                  return (
                    <tr key={r.id} data-find={find}>
                      {canSend && <td><input type="checkbox" form="send-donors" name="to" value={`contact:${r.id}`} aria-label={`Pick ${r.name}`} /></td>}
                      <td className="strong donor-cell">
                        <span className="row-name"><Avatar photo={r.photo} logo={r.logo} name={r.name} /><span><a href={`${base}/guests/${r.id}?event=${event.id}`}>{r.name}</a>{(letterEmails(r).to || r.handle) && <><br /><span className="small muted">{[letterEmails(r).to, r.handle].filter(Boolean).join(" · ")}</span></>}</span></span>
                        {canEdit && (
                          <EditDialog label="Edit details" buttonClass="btn small ghost" title={r.name} lead="This event's donation: their returned form, proof of payment, amount, receipt and thanks. Nothing is emailed.">
                            <form action={saveEventDonor} className="form">
                              <input type="hidden" name="event" value={event.id} />
                              <input type="hidden" name="contact" value={r.id} />
                              <div className="donation-files-row">
                                <DonationFiles eventId={event.id} contactId={r.id} kind="form" files={forms} base={base} label="Returned donation form" hint="The PDF they sent back, or a photo of a paper form. A filled-in PDF fills the details below." />
                                <DonationFiles eventId={event.id} contactId={r.id} kind="proof" files={proofs} base={base} label="Proof of payment" hint="Bank, GCash or BDO Pay screenshots, or a PDF. Up to 10." />
                              </div>
                              <div className="row-2">
                                <label className="field"><span>Status</span><select name="status" defaultValue={r.status}>{DONOR_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                                <label className="field"><span>Asked by</span><select name="askedVia" defaultValue={r.asked_via}>{ASKED_VIA.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                              </div>
                              <div className="row-3">
                                <label className="field"><span>Amount (₱) <small>Pledged or received, whole pesos</small></span><input name="amount" inputMode="numeric" defaultValue={r.amount ?? ""} placeholder="5000" /></label>
                                <label className="field"><span>Method</span><select name="method" defaultValue={r.method || ""}><option value="">Not set</option>{DONATION_METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
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
                              <fieldset className="donation-check">
                                <legend className="strong">Checked against HoR&apos;s account</legend>
                                {mayCheck ? (
                                  <>
                                    <input type="hidden" name="checkSent" value="1" />
                                    <label className="check"><input type="checkbox" name="checked" defaultChecked={Boolean(r.verified_at)} /> <span>I found this payment in HoR&apos;s account history (bank or GCash), for this amount and reference.</span></label>
                                    <p className="small muted" style={{ margin: 0 }}>{r.verified_at ? `Checked by ${checker(r)} on ${formatDay(r.verified_at)}. ` : ""}Needs the status Received, the amount and at least one proof of payment. Changing the amount, method or reference takes the check off.</p>
                                  </>
                                ) : (
                                  <p className="small muted" style={{ margin: 0 }}>{r.verified_at ? `Checked by ${checker(r)} on ${formatDay(r.verified_at)}.` : "Not checked yet."} Admins who check payments (Owner, Events lead) mark this.</p>
                                )}
                              </fieldset>
                              <div className="actions">
                                <ConfirmButton className="btn dark" title={`Save ${r.name}'s donation?`} items={["For this event only.", "Nothing is emailed.", "Attached files are already saved."]}>Save</ConfirmButton>
                                <ConfirmButton className="btn ghost" formAction={removeEventDonor} tone="alert" title={`Take ${r.name} off this event's donors?`} items={["Their returned form and proofs of payment for this event are deleted too.", "They stay in your guests for other events.", "Letters already sent stay in the log."]}>Remove from this event</ConfirmButton>
                              </div>
                            </form>
                          </EditDialog>
                        )}
                      </td>
                      {DONOR_COLUMNS.map((c) => <Fragment key={c.key}>{{
                        asked: <td data-col="asked" className="small">{labelOf(ASKED_VIA, r.asked_via)}{r.asked_via === "email" && <><br /><SendStatus sends={sends[`contact:${r.id}`]} letterName={letterName} /></>}</td>,
                        status: <td data-col="status"><span className={`chip ${statusTone[r.status] || ""}`.trim()}>{labelOf(DONOR_STATUSES, r.status)}</span></td>,
                        amount: <td data-col="amount" className="num">{r.amount != null ? <strong>{peso(r.amount)}</strong> : <span className="muted">—</span>}{r.status === "pledged" && r.amount != null && <><br /><span className="small muted">pledged</span></>}</td>,
                        method: <td data-col="method" className="small">{r.method ? labelOf(DONATION_METHODS, r.method) : <span className="muted">—</span>}</td>,
                        date: <td data-col="date" className="small nowrap">{r.received_on ? shortDay(r.received_on) : <span className="muted">—</span>}</td>,
                        reference: <td data-col="reference" className="small">{r.reference ? <span className="mono">{r.reference}</span> : <span className="muted">—</span>}{sameRef[r.id] && <><br /><span className="chip alert" title="The same reference number on two donations usually means one payment was entered twice.">Same as {sameRef[r.id].join(", ")}</span></>}</td>,
                        proof: <td data-col="proof" className="small">{proofs.length ? <FileViewer files={proofs} base={base} title={`Proof of payment · ${r.name}`} label={proofs.length > 1 ? `View ${proofs.length}` : "View"} /> : gave ? <span className="chip alert">No proof yet</span> : <span className="muted">—</span>}</td>,
                        form: <td data-col="form" className="small">{forms.length ? <FileViewer files={forms} base={base} title={`Returned form · ${r.name}`} label="View" /> : <span className="muted">None</span>}</td>,
                        checked: <td data-col="checked" className="small">{r.verified_at ? <><span className="chip good">Checked</span><br /><span className="muted" title={`Checked by ${checker(r)} on ${formatDay(r.verified_at)}`}>{shortDay(r.verified_at)} · {checker(r)}</span></> : gave ? <span className="chip">To check</span> : <span className="muted">—</span>}</td>,
                        receipt: <td data-col="receipt" className="small">{r.receipt_name || <span className="muted">Not given</span>}</td>,
                        address: <td data-col="address" className="small">{r.receipt_address || <span className="muted">Not given</span>}</td>,
                        thanks: <td data-col="thanks" className="small">{r.acknowledge === "public" ? <>Publicly, as <strong>{r.public_name}</strong></> : <span className="muted">Name kept private</span>}</td>,
                        notes: <td data-col="notes" className="small donor-notes">{r.event_notes || <span className="muted">—</span>}</td>,
                      }[c.key]}</Fragment>)}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  {canSend && <td />}
                  <th scope="row">Total received</th>
                  {DONOR_COLUMNS.map((c) => <td key={c.key} data-col={c.key} className={c.key === "amount" ? "num strong" : undefined}>{c.key === "amount" ? peso(totals.received) : c.key === "checked" ? <span className="small">{peso(totals.checked)} checked</span> : null}</td>)}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
