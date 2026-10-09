import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { changeRegistration, setFeeStatus } from "../../../actions";
import { Flash, NotAllowed, PageHead, formatDay } from "../../ui";

const FILTERS = [["all", "All"], ["confirmed", "Confirmed"], ["waitlist", "Waitlist"], ["checked", "Checked in"], ["cancelled", "Cancelled"]];
const FEE = { not_due: ["Not due yet", ""], waiting: ["Waiting for ref", "warn"], paid: ["Paid", "good"] };

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

  const confirmed = all.filter((r) => r.status === "confirmed");
  const waitlist = all.filter((r) => r.status === "waitlist");
  const checked = confirmed.filter((r) => r.checked_in_at);
  const filter = FILTERS.some(([k]) => k === query?.show) ? query.show : "all";
  const shown = all.filter((r) =>
    filter === "all" ? r.status !== "cancelled"
      : filter === "checked" ? r.checked_in_at
        : r.status === filter,
  );
  const canEdit = can(admin.roles, "registrations:edit");
  const canFees = can(admin.roles, "registrations:fees");
  const counts = { all: confirmed.length + waitlist.length, confirmed: confirmed.length, waitlist: waitlist.length, checked: checked.length, cancelled: all.length - confirmed.length - waitlist.length };
  const waitPosition = new Map(waitlist.map((r, i) => [r.id, i + 1]));

  return (
    <>
      <PageHead title={event.title} lead={`Registrations · ${formatDay(event.date)}${event.fee_required ? " · fee paid by QR" : ""}`}>
        <a className="btn ghost" href={`${base}/registrations/${event.id}/export`}>Export CSV</a>
        {can(admin.roles, "checkin") && <a className="btn gold" href={`${base}/checkin/${event.id}`}>Open check-in</a>}
      </PageHead>
      <Flash params={query} />

      <section className="grid-4" aria-label="Counts">
        <div className="stat"><span className="label">Capacity</span><span className="value">{event.capacity ?? "No limit"}</span><span className="small muted">Change it in the event editor</span></div>
        <div className="stat"><span className="label">Confirmed</span><span className="value">{confirmed.length}</span><span className="small muted">{event.capacity ? (confirmed.length >= event.capacity ? "Full · new sign-ups join the waitlist" : `${event.capacity - confirmed.length} slots left`) : "No limit"}</span></div>
        <div className="stat"><span className="label">Waitlist</span><span className="value">{waitlist.length}</span><span className="small muted">Offered in order, by hand</span></div>
        <div className="stat"><span className="label">{event.fee_required ? "Fees marked paid" : "Checked in"}</span><span className="value">{event.fee_required ? `${confirmed.filter((r) => r.fee_status === "paid").length} / ${confirmed.length}` : `${checked.length} / ${confirmed.length}`}</span><span className="small muted">{event.fee_required ? "Match QR references to the account" : "On the day"}</span></div>
      </section>

      <nav className="tabs" aria-label="Filter">
        {FILTERS.map(([key, label]) => (
          <a key={key} href={`${base}/registrations/${event.id}?show=${key}`} aria-current={filter === key ? "page" : undefined}>{label} · {counts[key]}</a>
        ))}
      </nav>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Furbaby</th><th>Email</th><th>Photos</th><th>Under 18</th>{event.fee_required && <th>Fee</th>}<th>Status</th><th><span className="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={8} className="empty">Nobody here yet.</td></tr>}
            {shown.map((r) => (
              <tr key={r.id}>
                <td className="strong">{r.name}</td>
                <td>{r.furbaby_name || "—"}</td>
                <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                <td><span className={`chip ${r.photo_consent ? "good" : ""}`}>{r.photo_consent ? "OK" : "No photos"}</span></td>
                <td>{r.under_18 ? `Yes · guardian: ${r.guardian_name}` : "No"}</td>
                {event.fee_required && (
                  <td>
                    {canFees && r.status !== "cancelled" ? (
                      <form action={setFeeStatus} className="actions">
                        <input type="hidden" name="id" value={r.id} />
                        <label className="visually-hidden" htmlFor={`fee-${r.id}`}>Fee status for {r.name}</label>
                        <select id={`fee-${r.id}`} name="fee" defaultValue={r.fee_status} style={{ width: "auto" }}>
                          <option value="not_due">Not due yet</option>
                          <option value="waiting">Waiting for ref</option>
                          <option value="paid">Paid</option>
                        </select>
                        <label className="visually-hidden" htmlFor={`ref-${r.id}`}>QR reference for {r.name}</label>
                        <input id={`ref-${r.id}`} type="text" name="reference" placeholder="Ref no." defaultValue={r.fee_reference || ""} style={{ width: 110 }} />
                        <button className="btn small ghost">Save</button>
                      </form>
                    ) : (
                      <span className={`chip ${FEE[r.fee_status][1]}`}>{FEE[r.fee_status][0]}</span>
                    )}
                  </td>
                )}
                <td>
                  {r.status === "confirmed" && <span className="chip good">{r.checked_in_at ? "Checked in" : "Confirmed"}</span>}
                  {r.status === "waitlist" && <span className="chip">Waitlist #{waitPosition.get(r.id)}</span>}
                  {r.status === "cancelled" && <span className="chip alert">Cancelled</span>}
                </td>
                <td>
                  {canEdit && r.status !== "cancelled" && (
                    <div className="actions">
                      {r.status === "waitlist" && (
                        <form action={changeRegistration}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="confirm" /><button className="linkish">Confirm</button></form>
                      )}
                      <form action={changeRegistration}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="cancel" /><button className="linkish">Cancel</button></form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="banner note small">When someone cancels, offer their slot to the first person on the waitlist, then press Confirm on their row. Under 18s come with the guardian named here. “No photos” also shows on the check-in screen.</p>
    </>
  );
}
