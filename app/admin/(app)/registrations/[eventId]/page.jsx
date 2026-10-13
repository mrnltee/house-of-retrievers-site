import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { FEE_STATUS, payMethodLabel, referenceKey, ticketLine } from "../../../../lib/eventPayments.mjs";
import { changeRegistration } from "../../../actions";
import { deleteRegistration, restoreRegistration } from "../../../registrationActions";
import ConfirmButton from "../../ConfirmButton";
import { Flash, NotAllowed, PageHead, formatDay } from "../../ui";

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

  const current = all.filter((r) => !r.deleted_at);
  const deleted = all.filter((r) => r.deleted_at);
  const live = current.filter((r) => r.status !== "cancelled");
  const confirmed = current.filter((r) => r.status === "confirmed");
  const waitlist = current.filter((r) => r.status === "waitlist");
  const checked = confirmed.filter((r) => r.checked_in_at);
  const toCheck = confirmed.filter((r) => r.fee_status === "review");
  const pending = confirmed.filter((r) => r.fee_status === "waiting" || r.fee_status === "rejected");
  const paid = confirmed.filter((r) => r.fee_status === "paid");
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
  const capacityNote = event.capacity ? (confirmed.length >= event.capacity ? "Full · new sign-ups join the waitlist" : `${event.capacity - confirmed.length} slots left`) : "No limit";

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
            <div className="stat"><span className="label">Confirmed</span><span className="value">{event.capacity ? `${confirmed.length} / ${event.capacity}` : confirmed.length}</span><span className="small muted">{capacityNote}</span></div>
            <a className={`stat${toCheck.length ? " stat-warn" : ""}`} href={`${base}/registrations/${event.id}?show=check`}><span className="label">To check</span><span className="value">{toCheck.length}</span><span className="small muted">Proof uploaded, waiting for an admin</span></a>
            <a className="stat" href={`${base}/registrations/${event.id}?show=pending`}><span className="label">Payment pending</span><span className="value">{pending.length}</span><span className="small muted">Spot held, no approved payment yet</span></a>
            <a className="stat" href={`${base}/registrations/${event.id}?show=paid`}><span className="label">Paid</span><span className="value">{paid.length}</span><span className="small muted">{peso(paid.reduce((sum, r) => sum + (r.pay_amount ?? r.ticket_amount ?? 0), 0))} matched · QR passes sent</span></a>
          </>
        ) : (
          <>
            <div className="stat"><span className="label">Capacity</span><span className="value">{event.capacity ?? "No limit"}</span><span className="small muted">Change it in the event editor</span></div>
            <div className="stat"><span className="label">Confirmed</span><span className="value">{confirmed.length}</span><span className="small muted">{capacityNote}</span></div>
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
            <tr><th>Name</th>{paidEvent ? <><th>Ticket</th><th>Payment</th></> : <th>Furbaby</th>}<th>Email</th><th>Notes</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={8} className="empty">Nobody here yet.</td></tr>}
            {shown.map((r) => {
              const fee = FEE_STATUS[r.fee_status] || FEE_STATUS.not_due;
              const twins = sameRef(r);
              const detail = `${base}/registrations/${event.id}/r/${r.id}`;
              return (
                <tr key={r.id}>
                  <td><a className="strong" href={detail}>{r.name}</a>{paidEvent && r.furbaby_name && <><br /><span className="small muted">Furbaby: {r.furbaby_name}</span></>}{r.added_by && <><br /><span className="small muted">Added by an admin</span></>}</td>
                  {paidEvent ? (
                    <>
                      <td>{ticketLine(r.ticket_label, r.ticket_amount) || "—"}</td>
                      <td>
                        {r.status === "confirmed" ? <span className={`chip ${fee.tone}`}>{fee.label}</span> : <span className="small muted">—</span>}
                        {r.fee_reference && <><br /><span className="small muted">{[payMethodLabel(r.pay_method), `Ref ${r.fee_reference}`, r.pay_amount != null ? peso(r.pay_amount) : ""].filter(Boolean).join(" · ")}</span></>}
                        {r.fee_status === "rejected" && r.fee_note && <><br /><span className="small muted">“{r.fee_note.slice(0, 60)}{r.fee_note.length > 60 ? "…" : ""}”</span></>}
                        {r.fee_status === "waiting" && <><br /><span className="small muted">No proof yet</span></>}
                        {twins.length > 0 && <><br /><span className="small danger-text">⚠ Same reference as {twins.map((t) => t.name).join(", ")}</span></>}
                      </td>
                    </>
                  ) : (
                    <td>{r.furbaby_name || "—"}</td>
                  )}
                  <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                  <td className="small">
                    {!r.photo_consent && <span className="chip">No photos</span>} {r.under_18 && <span className="chip warn">Under 18 · {r.guardian_name}</span>}
                  </td>
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
            <strong>How payments work.</strong> “To check” rows have a reference number and screenshot: open Check, find the reference and amount in HOR&apos;s GCash, Maya or GoTyme history, then Approve, and their QR pass is emailed. Ask for a new receipt when it can&apos;t be matched or read; their spot stays held. Held spots have no time limit: if someone backs out, Cancel them, then Confirm the next person on the waitlist. Payments are non-refundable.
          </span>
        ) : (
          <span>When someone cancels, offer their slot to the first person on the waitlist, then press Confirm on their row. Under 18s come with the guardian named here. “No photos” also shows on the check-in screen.</span>
        )}
      </div>
    </>
  );
}
