import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { FEE_STATUS, payMethodLabel, referenceKey, ticketLine } from "../../../../lib/eventPayments.mjs";
import { changeRegistration } from "../../../actions";
import { deleteRegistration, manualCheckIn, restoreRegistration, undoCheckIn } from "../../../registrationActions";
import { manualCheckInWarnings } from "../../../../lib/manualCheckIn.mjs";
import { manilaParts } from "../../../../lib/rsvpOpens.mjs";
import { capacityUnitLabel, capacityUnits } from "../../../../lib/eventCapacity.mjs";
import { isActiveRegistrationHold } from "../../../../lib/registrationHolds.mjs";
import { welcomePhotosFor } from "../../../../lib/welcomePhotos";
import WelcomeAvatar from "../WelcomeAvatar";
import ConfirmButton from "../../ConfirmButton";
import { Flash, NotAllowed, PageHead, formatDay, formatWhen } from "../../ui";

const BASE_FILTERS = [["all", "All"], ["confirmed", "Confirmed"], ["waitlist", "Waitlist"], ["checked", "Checked in"], ["cancelled", "Cancelled"], ["deleted", "Recently deleted"]];
const PAY_FILTERS = [["all", "All"], ["check", "To check"], ["pending", "Payment pending"], ["paid", "Paid"], ["waitlist", "Waitlist"], ["checked", "Checked in"], ["cancelled", "Cancelled"], ["deleted", "Recently deleted"]];
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;

/**
 * One event's registrations (Figma A4; R1 for paid events): who's coming,
 * the waitlist, and on a paid event the payments to check. Every action asks
 * first (ConfirmButton).
 */
export default async function EventRegistrations({ params, searchParams }) {
  const { eventId } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("registrations:view");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const [event] = await sql("SELECT * FROM events WHERE id=$1", [eventId]);
  if (!event) notFound();
  const base = await adminBase();
  const all = await sql("SELECT * FROM registrations WHERE event_id=$1 ORDER BY created_at", [eventId]);
  const paidEvent = event.fee_required;
  const acknowledgementEnabled = Boolean(event.rsvp_form_config?.consentEnabled);

  const current = all.filter((r) => !r.deleted_at);
  const deleted = all.filter((r) => r.deleted_at);
  const welcome = await welcomePhotosFor(current);
  const nowParts = manilaParts(new Date().toISOString());
  const live = current.filter((r) => r.status !== "cancelled");
  const confirmed = current.filter((r) => r.status === "confirmed");
  const waitlist = current.filter((r) => r.status === "waitlist");
  const checked = confirmed.filter((r) => r.checked_in_at);
  const toCheck = confirmed.filter((r) => r.fee_status === "review");
  const pending = confirmed.filter((r) => r.fee_status === "waiting" || r.fee_status === "rejected");
  const paid = confirmed.filter((r) => r.fee_status === "paid");
  const capacityUsed = confirmed.filter((r) => isActiveRegistrationHold({ feeStatus: r.fee_status, holdExpiresAt: r.hold_expires_at })).reduce((sum, r) => sum + capacityUnits(event.capacity_basis, { humans: r.human_count, furbabies: r.furbaby_count }), 0);
  const capacityLabel = capacityUnitLabel(event.capacity_basis);
  const FILTERS = paidEvent ? PAY_FILTERS : BASE_FILTERS;
  const filter = FILTERS.some(([k]) => k === query?.show) ? query.show : "all";
  const shown = all.filter((r) =>
    filter === "deleted" ? Boolean(r.deleted_at)
      : r.deleted_at ? false
      : filter === "all" ? r.status !== "cancelled"
      : filter === "checked" ? r.checked_in_at
        : filter === "check" ? r.status === "confirmed" && r.fee_status === "review"
          : filter === "pending" ? r.status === "confirmed" && (r.fee_status === "waiting" || r.fee_status === "rejected")
            : filter === "paid" ? r.status === "confirmed" && r.fee_status === "paid"
              : r.status === filter,
  );
  // The same reference on two registrations of this event usually means one screenshot shared by two people.
  const byRef = new Map();
  for (const r of live) if (r.fee_reference) byRef.set(referenceKey(r.fee_reference), [...(byRef.get(referenceKey(r.fee_reference)) || []), r]);
  const sameRef = (r) => (r.fee_reference ? (byRef.get(referenceKey(r.fee_reference)) || []).filter((o) => o.id !== r.id) : []);

  const canEdit = can(admin.roles, "registrations:edit");
  const canFees = can(admin.roles, "registrations:fees");
  const counts = {
    all: live.length, confirmed: confirmed.length, waitlist: waitlist.length, checked: checked.length, cancelled: current.filter((r) => r.status === "cancelled").length, deleted: deleted.length,
    check: toCheck.length, pending: pending.length, paid: paid.length,
  };
  const waitPosition = new Map(waitlist.map((r, i) => [r.id, i + 1]));
  const capacityNote = event.capacity ? (capacityUsed >= event.capacity ? `Full · new sign-ups join the waitlist` : `${event.capacity - capacityUsed} ${capacityLabel} left`) : `No limit · capacity is counted by ${capacityLabel}`;

  return (
    <>
      <PageHead title={event.title} lead={`Registrations · ${formatDay(event.date)}${paidEvent ? " · paid event · payments checked by hand" : ""}`}>
        <a className="btn ghost" href={`${base}/registrations/${event.id}/export`}>Export CSV</a>
        {canEdit && <a className="btn ghost" href={`${base}/registrations/${event.id}/add`}>+ Add registration</a>}
        {can(admin.roles, "checkin") && <a className="btn gold" href={`${base}/checkin/${event.id}`}>Open check-in</a>}
      </PageHead>
      <Flash params={query} />

      <section className="grid-4" aria-label="Counts">
        {paidEvent ? (
          <>
            <div className="stat"><span className="label">Capacity used</span><span className="value">{event.capacity ? `${capacityUsed} / ${event.capacity}` : capacityUsed}</span><span className="small muted">{capacityNote}</span></div>
            <a className={`stat${toCheck.length ? " stat-warn" : ""}`} href={`${base}/registrations/${event.id}?show=check`}><span className="label">To check</span><span className="value">{toCheck.length}</span><span className="small muted">Proof uploaded, waiting for an admin</span></a>
            <a className="stat" href={`${base}/registrations/${event.id}?show=pending`}><span className="label">Payment pending</span><span className="value">{pending.length}</span><span className="small muted">Spot held, no approved payment yet</span></a>
            <a className="stat" href={`${base}/registrations/${event.id}?show=paid`}><span className="label">Paid</span><span className="value">{paid.length}</span><span className="small muted">{peso(paid.reduce((sum, r) => sum + (r.pay_amount ?? r.amount_due ?? r.ticket_amount ?? 0), 0))} matched · QR passes sent</span></a>
          </>
        ) : (
          <>
            <div className="stat"><span className="label">Capacity</span><span className="value">{event.capacity ?? "No limit"}</span><span className="small muted">Change it in the event editor</span></div>
            <div className="stat"><span className="label">Capacity used</span><span className="value">{event.capacity ? `${capacityUsed} / ${event.capacity}` : capacityUsed}</span><span className="small muted">{capacityNote}</span></div>
            <div className="stat"><span className="label">Waitlist</span><span className="value">{waitlist.length}</span><span className="small muted">Offered in order, by hand</span></div>
            <div className="stat"><span className="label">Checked in</span><span className="value">{checked.length} / {confirmed.length}</span><span className="small muted">On the day</span></div>
          </>
        )}
      </section>

      <nav className="tabs" aria-label="Filter">
        {FILTERS.map(([key, label]) => (
          <a key={key} href={`${base}/registrations/${event.id}?show=${key}`} aria-current={filter === key ? "page" : undefined}>{label} · {counts[key]}</a>
        ))}
      </nav>

      <div className="table-wrap">
        <table className="registrations-table">
          <thead>
            <tr><th>Name</th><th>Furbaby</th>{paidEvent && <><th>Ticket</th><th>Payment</th></>}<th>Email</th><th>Notes</th><th>Acknowledged</th><th>Checked in</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={paidEvent ? 10 : 8} className="empty">Nobody here yet.</td></tr>}
            {shown.map((r) => {
              const fee = FEE_STATUS[r.fee_status] || FEE_STATUS.not_due;
              const twins = sameRef(r);
              const detail = `${base}/registrations/${event.id}/r/${r.id}`;
              return (
                <tr key={r.id}>
                  <td><span className="welcome-name">{!r.deleted_at && <WelcomeAvatar base={base} eventId={event.id} registrationId={r.id} resolved={welcome.get(r.id)} />}<a className="strong" href={detail}>{r.name}</a></span>{paidEvent && <><br /><span className="small muted">{r.human_count ?? 1} people · {r.furbaby_count ?? 0} furbabies</span></>}{r.added_by && <><br /><span className="small muted">Added by an admin</span></>}</td>
                  <td>{r.furbaby_name || "—"}</td>
                  {paidEvent && (
                    <>
                      <td>{ticketLine(r.ticket_label, r.amount_due ?? r.ticket_amount) || "—"}</td>
                      <td>
                        {r.status === "confirmed" ? <span className={`chip ${fee.tone}`}>{fee.label}</span> : <span className="small muted">—</span>}
                        {r.fee_reference && <><br /><span className="small muted">{[payMethodLabel(r.pay_method), `Ref ${r.fee_reference}`, r.pay_amount != null ? peso(r.pay_amount) : ""].filter(Boolean).join(" · ")}</span></>}
                        {r.fee_status === "rejected" && r.fee_note && <><br /><span className="small muted">“{r.fee_note.slice(0, 60)}{r.fee_note.length > 60 ? "…" : ""}”</span></>}
                        {r.fee_status === "waiting" && (isActiveRegistrationHold({ feeStatus: r.fee_status, holdExpiresAt: r.hold_expires_at }) ? <><br /><span className="small muted">No proof yet</span></> : <><br /><span className="chip alert">Hold expired</span></>)}
                        {twins.length > 0 && <><br /><span className="small danger-text">⚠ Same reference as {twins.map((t) => t.name).join(", ")}</span></>}
                      </td>
                    </>
                  )}
                  <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                  <td className="small">
                    {!r.photo_consent && <span className="chip">No photos</span>} {r.under_18 && <span className="chip warn">Under 18 · {r.guardian_name}</span>}
                  </td>
                  <td>
                    {!acknowledgementEnabled ? <span className="small muted">Not required</span>
                      : r.consent_completed_at ? <span className="chip good" title={new Date(r.consent_completed_at).toLocaleString("en-PH")}>Yes</span>
                        : <span className="chip warn">Needed</span>}
                  </td>
                  <td className="small">{r.checked_in_at ? <span className="chip good" title={formatWhen(r.checked_in_at)}>Yes · {new Intl.DateTimeFormat("en-PH", { timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(r.checked_in_at))}</span> : <span className="muted">Not yet</span>}{r.checked_in_source === "manual" && <><br /><span className="small muted">Added by hand</span></>}</td>
                  <td>
                    {r.status === "confirmed" && <span className="chip good">{r.checked_in_at ? "Checked in" : "Confirmed"}</span>}
                    {r.status === "waitlist" && <span className="chip">Waitlist #{waitPosition.get(r.id)}</span>}
                    {r.deleted_at ? <span className="chip alert">Deleted · recoverable</span> : r.status === "cancelled" && <span className="chip alert">Cancelled</span>}
                  </td>
                  <td>
                    <div className="actions">
                      {paidEvent && r.status === "confirmed" && canFees && r.fee_status === "review" && <a className="btn small gold" href={detail}>Check</a>}
                      {paidEvent && r.status === "confirmed" && canFees && (r.fee_status === "waiting" || r.fee_status === "rejected") && <a className="btn small ghost" href={detail}>Add receipt</a>}
                      {(!paidEvent || r.fee_status === "paid" || r.fee_status === "not_due" || r.status !== "confirmed" || !canFees) && <a className="btn small ghost" href={detail}>View</a>}
                      {canEdit && r.status === "waitlist" && (
                        <form action={changeRegistration}>
                          <input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="confirm" />
                          <ConfirmButton
                            className="linkish"
                            title={`Give ${r.name} a spot?`}
                            items={[
                              "Waitlist → Confirmed (it counts toward capacity)",
                              paidEvent ? `Their payment becomes pending, and ${r.email} is emailed how to pay` : `Their QR pass is emailed to ${r.email}`,
                            ]}
                            yes="Yes, confirm them"
                          >Confirm</ConfirmButton>
                        </form>
                      )}
                      {canEdit && !r.deleted_at && r.status !== "cancelled" && (
                        <form action={changeRegistration}>
                          <input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="cancel" />
                          <ConfirmButton
                            className="linkish danger-text"
                            title={`Cancel ${r.name}'s registration?`}
                            items={[
                              r.status === "confirmed" ? "Their slot is freed for the next person on the waitlist" : "They're taken off the waitlist",
                              "Their pass stops working at the door",
                              ...(paidEvent && r.fee_status === "paid" ? ["No refund is issued (charity event)"] : []),
                              "They aren't emailed; let them know yourself",
                            ]}
                            yes="Yes, cancel it"
                            tone="danger"
                          >Cancel</ConfirmButton>
                        </form>
                      )}
                      {canEdit && !r.deleted_at && r.status === "confirmed" && !r.checked_in_at && (
                        <details className="manual-checkin">
                          <summary className="linkish">Check in</summary>
                          <form action={manualCheckIn} className="form" style={{ gap: 8 }}>
                            <input type="hidden" name="id" value={r.id} />
                            <label className="field"><span>Arrived on</span><input type="date" name="checkinDate" required defaultValue={nowParts.date} /></label>
                            <label className="field"><span>At <small>Manila time</small></span><input type="time" name="checkinTime" required defaultValue={nowParts.time} /></label>
                            <ConfirmButton
                              className="btn small gold"
                              title={`Check in ${r.name}?`}
                              echo={[{ name: "checkinDate", label: "Arrived on" }, { name: "checkinTime", label: "At (Manila)" }]}
                              items={["They're marked as checked in at that time", "It's recorded as added by hand, under your name", "Nothing is emailed"]}
                              note={(() => { const warn = manualCheckInWarnings({ ...r, fee_required: paidEvent, rsvp_form_config: event.rsvp_form_config }); return warn.length ? `${warn.join(" · ")}. They'll still be checked in, since they were there; follow up separately.` : ""; })()}
                              yes="Yes, check them in"
                            >Check in</ConfirmButton>
                          </form>
                        </details>
                      )}
                      {canEdit && !r.deleted_at && r.checked_in_at && (
                        <form action={undoCheckIn}>
                          <input type="hidden" name="id" value={r.id} />
                          <ConfirmButton className="linkish" title={`Undo ${r.name}'s check-in?`} items={["Their check-in time is cleared", "Their registration, payment and QR pass stay unchanged"]} yes="Yes, undo it" tone="ghost">Undo check-in</ConfirmButton>
                        </form>
                      )}
                      {canEdit && !r.deleted_at && r.fee_status !== "paid" && !r.checked_in_at && (
                        <form action={deleteRegistration}>
                          <input type="hidden" name="id" value={r.id} />
                          <ConfirmButton className="linkish danger-text" title={`Delete ${r.name}'s registration?`} items={["It moves to Recently deleted for 30 days", "Its slot is freed and its QR pass stops working", "It can be restored during those 30 days", "After that, the registration and receipts are permanently removed"]} yes="Yes, move it" tone="danger">Delete</ConfirmButton>
                        </form>
                      )}
                      {canEdit && r.deleted_at && (
                        <form action={restoreRegistration}>
                          <input type="hidden" name="id" value={r.id} />
                          <ConfirmButton className="linkish" title={`Restore ${r.name}'s registration?`} items={["It returns to its previous status", "A confirmed registration takes a slot again", "Its original QR link works again"]} yes="Yes, restore it">Restore</ConfirmButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="banner note small">
        {paidEvent ? (
          <span>
            <strong>How payments work.</strong> “To check” rows have a reference number and screenshot: open Check, find the reference and amount in HOR&apos;s GCash, Maya or GoTyme history, then Approve, and their QR pass is emailed. Ask for a new receipt when it can&apos;t be matched or read; their spot stays held. A held spot&apos;s payment window is set in the event editor (default 24 hours); once it expires the slot frees up, though a late payment can still be approved if there&apos;s room. If someone backs out, Cancel them, then Confirm the next person on the waitlist. Payments are non-refundable.
          </span>
        ) : (
          <span>When someone cancels, offer their slot to the first person on the waitlist, then press Confirm on their row. Under 18s come with the guardian named here. “No photos” also shows on the check-in screen.</span>
        )}
      </div>
    </>
  );
}
