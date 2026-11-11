import { answerText, cleanCustomQuestions } from "../../../../lib/customQuestions.mjs";
import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { FEE_STATUS, payMethodLabel, referenceKey, ticketLine } from "../../../../lib/eventPayments.mjs";
import { changeRegistration } from "../../../actions";
import { deleteRegistration, manualCheckIn, remindExpiredHolds, restoreRegistration, undoCheckIn } from "../../../registrationActions";
import { manualCheckInWarnings } from "../../../../lib/manualCheckIn.mjs";
import { manilaParts } from "../../../../lib/rsvpOpens.mjs";
import { capacityUnitLabel, capacityUnits } from "../../../../lib/eventCapacity.mjs";
import { missingVaccinationCards } from "../../../../lib/vaccinationRecords.mjs";
import { DEFAULT_REMINDER_HOLD_MINUTES, REMINDER_HOLD_OPTIONS, isActiveRegistrationHold, isExpiredHold } from "../../../../lib/registrationHolds.mjs";
import { welcomePhotosFor } from "../../../../lib/welcomePhotos";
import WelcomeAvatar from "../WelcomeAvatar";
import FurbabyList from "../FurbabyList";
import ConfirmButton from "../../ConfirmButton";
import { isActivityCategory } from "../../../../lib/eventCategories.mjs";
import { Flash, NotAllowed, PageHead, formatDay, formatWhen } from "../../ui";
import { eventLetters } from "../../../../lib/letterStore";
import { isInvitation } from "../../../../lib/invitationCard.mjs";
import { reminderEligibility } from "../../../../lib/eventReminders.mjs";
import { MAX_LETTER_RECIPIENTS } from "../../../../lib/letters.mjs";

const BASE_FILTERS = [["all", "All"], ["confirmed", "Confirmed"], ["waitlist", "Waitlist"], ["checked", "Checked in"], ["notchecked", "Not checked in"], ["novax", "No vaccination card"], ["cancelled", "Cancelled"], ["deleted", "Recently deleted"]];
const PAY_FILTERS = [["all", "All"], ["check", "To check"], ["pending", "Payment pending"], ["expired", "Hold expired"], ["paid", "Paid"], ["waitlist", "Waitlist"], ["checked", "Checked in"], ["notchecked", "Not checked in"], ["novax", "No vaccination card"], ["cancelled", "Cancelled"], ["deleted", "Recently deleted"]];
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
  // Invitation cards (owner, 2026-11-11): the event's invitation letter, sent to confirmed participants
  // who haven't had it yet (a failed or bounced email counts as not sent), up to a send's limit at a time.
  const inviteLetter = can(admin, "letters:edit") ? (await eventLetters(eventId)).find((l) => isInvitation(l.invitation)) : null;
  let inviteTodo = [];
  if (inviteLetter) {
    const sent = new Set((await sql("SELECT DISTINCT ref FROM letter_sends WHERE letter_key = $1 AND status NOT IN ('failed', 'bounced')", [inviteLetter.key])).map((r) => r.ref));
    inviteTodo = all.filter((r) => reminderEligibility(r, { feeRequired: Boolean(paidEvent) }).ok && !sent.has(`registration:${r.id}`));
  }
  const inviteHref = inviteLetter && inviteTodo.length
    ? `${base}/letters/send?${new URLSearchParams([["letter", inviteLetter.key], ["event", eventId], ["list", "registrations"], ...inviteTodo.slice(0, MAX_LETTER_RECIPIENTS).map((r) => ["to", `registration:${r.id}`])]).toString()}`
    : "";
  const acknowledgementEnabled = Boolean(event.rsvp_form_config?.consentEnabled);
  const tableQuestions = cleanCustomQuestions(event.rsvp_form_config?.questions).filter((q) => q.showInTable);

  const current = all.filter((r) => !r.deleted_at);
  const deleted = all.filter((r) => r.deleted_at);
  const welcome = await welcomePhotosFor(current);
  // Furbaby positions that already have a card, so "No vaccination card" lists confirmed guests with a dog still missing one.
  const cardRows = current.length ? await sql("SELECT registration_id, furbaby_index FROM registration_vaccination_records WHERE registration_id = ANY($1::uuid[])", [current.map((r) => r.id)]) : [];
  const cardsOf = new Map();
  for (const row of cardRows) cardsOf.set(row.registration_id, [...(cardsOf.get(row.registration_id) || []), { index: row.furbaby_index }]);
  const lacksCard = (r) => r.status === "confirmed" && missingVaccinationCards(cardsOf.get(r.id) || [], r.furbaby_count).length > 0;
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
  // Who's coming (owner, 2026-11-04): hoomans and furbabies on spots that count (as Capacity used), and how many of those are paid.
  const holding = confirmed.filter((r) => isActiveRegistrationHold({ feeStatus: r.fee_status, holdExpiresAt: r.hold_expires_at }));
  const total = (rows, key, none) => rows.reduce((sum, r) => sum + (r[key] ?? none), 0);
  const heads = { humans: total(holding, "human_count", 1), furbabies: total(holding, "furbaby_count", 0), paidHumans: total(paid, "human_count", 1), paidFurbabies: total(paid, "furbaby_count", 0) };
  // The vaccination tab only appears for events that ask for cards (or already have some).
  const showVax = Boolean(event.vaccination_record_required) || cardRows.length > 0;
  const FILTERS = (paidEvent ? PAY_FILTERS : BASE_FILTERS).filter(([k]) => k !== "novax" || event.vaccination_record_required || cardRows.length > 0);
  const filter = FILTERS.some(([k]) => k === query?.show) ? query.show : "all";
  const shown = all.filter((r) =>
    filter === "deleted" ? Boolean(r.deleted_at)
      : r.deleted_at ? false
      : filter === "all" ? r.status !== "cancelled"
      : filter === "checked" ? r.checked_in_at
      : filter === "notchecked" ? r.status === "confirmed" && !r.checked_in_at
      : filter === "novax" ? lacksCard(r)
        : filter === "check" ? r.status === "confirmed" && r.fee_status === "review"
          : filter === "pending" ? r.status === "confirmed" && (r.fee_status === "waiting" || r.fee_status === "rejected")
            : filter === "expired" ? isExpiredHold(r)
            : filter === "paid" ? r.status === "confirmed" && r.fee_status === "paid"
              : r.status === filter,
  );
  // The same reference on two registrations of this event usually means one screenshot shared by two people.
  const byRef = new Map();
  for (const r of live) if (r.fee_reference) byRef.set(referenceKey(r.fee_reference), [...(byRef.get(referenceKey(r.fee_reference)) || []), r]);
  const sameRef = (r) => (r.fee_reference ? (byRef.get(referenceKey(r.fee_reference)) || []).filter((o) => o.id !== r.id) : []);

  const canEdit = can(admin, "registrations:edit");
  const canFees = can(admin, "registrations:fees");
  const counts = {
    all: live.length, confirmed: confirmed.length, waitlist: waitlist.length, checked: checked.length, notchecked: confirmed.length - checked.length, novax: current.filter(lacksCard).length, cancelled: current.filter((r) => r.status === "cancelled").length, deleted: deleted.length,
    check: toCheck.length, pending: pending.length, paid: paid.length, expired: current.filter((r) => isExpiredHold(r)).length,
  };
  const waitPosition = new Map(waitlist.map((r, i) => [r.id, i + 1]));
  const publicHumans = confirmed.filter((r) => !r.added_by && isActiveRegistrationHold({ feeStatus: r.fee_status, holdExpiresAt: r.hold_expires_at })).reduce((sum, r) => sum + (r.human_count ?? 1), 0);
  const humansNote = event.max_public_humans ? <><br /><span className="small muted">Hoomans from public RSVPs: <strong>{publicHumans} / {event.max_public_humans}</strong>{publicHumans >= event.max_public_humans ? " · full, new RSVPs join the waitlist" : ""}</span></> : null;
  const capacityNote = event.capacity ? (capacityUsed >= event.capacity ? `Full · new sign-ups join the waitlist` : `${event.capacity - capacityUsed} ${capacityLabel} left`) : `No limit · capacity is counted by ${capacityLabel}`;

  return (
    <>
      <PageHead title={event.title} lead={`${isActivityCategory(event.category) ? "Participants" : "Registrations"} · ${formatDay(event.date)}${paidEvent ? " · paid event · payments checked by hand" : ""}`}>
        <a className="btn ghost" href={`${base}/registrations/${event.id}/export`}>Export CSV</a>
        {canEdit && <a className="btn ghost" href={`${base}/registrations/${event.id}/import`}>Import from Excel</a>}
        {canEdit && <a className="btn ghost" href={`${base}/registrations/${event.id}/reminder`}>Email participants</a>}
        {inviteHref && <a className="btn ghost" href={inviteHref} title={inviteTodo.length > MAX_LETTER_RECIPIENTS ? `Opens the first ${MAX_LETTER_RECIPIENTS}; the rest come up after that send` : "Confirmed participants who haven't had the invitation card yet"}>Send invitation cards · {inviteTodo.length}</a>}
        {inviteLetter && !inviteTodo.length && <span className="small muted" style={{ alignSelf: "center" }}>Invitation cards sent to everyone confirmed</span>}
        {canEdit && <a className="btn ghost" href={`${base}/registrations/${event.id}/add`}>+ Add registration</a>}
        {can(admin, "checkin") && <a className="btn gold" href={`${base}/checkin/${event.id}`}>Open check-in</a>}
      </PageHead>
      <Flash params={query} />

      <section className="grid-4" aria-label="Who's coming">
        <div className="stat"><span className="label">Hoomans registered</span><span className="value">{heads.humans}</span><span className="small muted">{paidEvent ? `${heads.paidHumans} paid · ${heads.humans - heads.paidHumans} holding a spot` : "On confirmed spots"}</span></div>
        <div className="stat"><span className="label">Furbabies registered</span><span className="value">{heads.furbabies}</span><span className="small muted">{paidEvent ? `${heads.paidFurbabies} paid · ${heads.furbabies - heads.paidFurbabies} holding a spot` : "On confirmed spots"}</span></div>
      </section>
      <section className="grid-4" aria-label="Counts">
        {paidEvent ? (
          <>
            <div className="stat"><span className="label">Capacity used</span><span className="value">{event.capacity ? `${capacityUsed} / ${event.capacity}` : capacityUsed}</span><span className="small muted">{capacityNote}</span>{humansNote}</div>
            <a className={`stat${toCheck.length ? " stat-warn" : ""}`} href={`${base}/registrations/${event.id}?show=check`}><span className="label">To check</span><span className="value">{toCheck.length}</span><span className="small muted">Proof uploaded, waiting for an admin</span></a>
            <a className="stat" href={`${base}/registrations/${event.id}?show=pending`}><span className="label">Payment pending</span><span className="value">{pending.length}</span><span className="small muted">Spot held, no approved payment yet</span></a>
            <a className="stat" href={`${base}/registrations/${event.id}?show=paid`}><span className="label">Paid</span><span className="value">{paid.length}</span><span className="small muted">{peso(paid.reduce((sum, r) => sum + Number(r.pay_amount ?? r.amount_due ?? r.ticket_amount ?? 0) - Number(r.refund_amount || 0), 0))} matched · QR passes sent</span></a>
          </>
        ) : (
          <>
            <div className="stat"><span className="label">Capacity</span><span className="value">{event.capacity ?? "No limit"}</span><span className="small muted">Change it in the event editor</span></div>
            <div className="stat"><span className="label">Capacity used</span><span className="value">{event.capacity ? `${capacityUsed} / ${event.capacity}` : capacityUsed}</span><span className="small muted">{capacityNote}</span>{humansNote}</div>
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

      {filter === "expired" && canFees && counts.expired > 0 && (
        <form action={remindExpiredHolds} className="card form remind-all">
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="all" value="1" />
          <p className="small" style={{ margin: 0 }}><strong>Their payment time ran out.</strong> A reminder holds each spot again (if there&apos;s still room) and emails their payment link with the new deadline. Anyone who no longer fits is skipped and listed.</p>
          <label className="field"><span>Hold their spot again for</span>
            <select name="minutes" defaultValue={DEFAULT_REMINDER_HOLD_MINUTES}>{REMINDER_HOLD_OPTIONS.map(([m, label]) => <option key={m} value={m}>{label}</option>)}</select>
          </label>
          <ConfirmButton className="btn gold" title={`Remind all ${counts.expired} with an expired hold?`} items={["Each one that still fits gets their spot held again and an email with their payment link and new deadline", "Anyone with no room left is skipped (no email)"]} yes="Yes, send reminders">Remind all · {counts.expired}</ConfirmButton>
        </form>
      )}

      <div className="table-wrap">
        <table className="registrations-table">
          <thead>
            <tr><th>Name</th><th>Furbaby</th>{paidEvent && <><th>Ticket</th><th>Payment</th></>}<th>Email</th>{tableQuestions.map((q) => <th key={q.id} title={q.label}>{q.label.length > 28 ? `${q.label.slice(0, 27)}…` : q.label}</th>)}<th>Notes</th>{showVax && <th>Vaccination</th>}<th>Acknowledged</th><th>Checked in</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={(paidEvent ? 10 : 8) + tableQuestions.length + (showVax ? 1 : 0)} className="empty">Nobody here yet.</td></tr>}
            {shown.map((r) => {
              const fee = FEE_STATUS[r.fee_status] || FEE_STATUS.not_due;
              const twins = sameRef(r);
              const detail = `${base}/registrations/${event.id}/r/${r.id}`;
              return (
                <tr key={r.id}>
                  <td><span className="welcome-name">{!r.deleted_at && <WelcomeAvatar base={base} eventId={event.id} registrationId={r.id} resolved={welcome.get(r.id)} />}<a className="strong" href={detail}>{r.name}</a></span>{paidEvent && <><br /><span className="small muted">{r.human_count ?? 1} people · {r.furbaby_count ?? 0} furbabies</span></>}{r.added_by && <><br /><span className="small muted">Added by an admin</span></>}</td>
                  <td><FurbabyList names={r.furbaby_name} breeds={r.furbaby_breeds} sexes={r.furbaby_sexes} ages={r.furbaby_ages} /></td>
                  {paidEvent && (
                    <>
                      <td>{ticketLine(r.ticket_label, r.amount_due ?? r.ticket_amount) || "—"}</td>
                      <td>
                        {r.status === "confirmed" ? <span className={`chip ${fee.tone}`}>{fee.label}</span> : <span className="small muted">—</span>}
                        {r.fee_reference && <><br /><span className="small muted">{[payMethodLabel(r.pay_method), `Ref ${r.fee_reference}`, r.pay_amount != null ? peso(r.pay_amount) : ""].filter(Boolean).join(" · ")}</span></>}
                        {r.fee_status === "rejected" && r.fee_note && <><br /><span className="small muted">“{r.fee_note.slice(0, 60)}{r.fee_note.length > 60 ? "…" : ""}”</span></>}
                        {r.fee_status === "waiting" && (isActiveRegistrationHold({ feeStatus: r.fee_status, holdExpiresAt: r.hold_expires_at }) ? <><br /><span className="small muted">No proof yet</span></> : <><br /><span className="chip alert">Hold expired</span>{r.hold_reminders ? <span className="small muted"> · reminded {r.hold_reminders}×</span> : null}</>)}
                        {twins.length > 0 && <><br /><span className="small danger-text">⚠ Same reference as {twins.map((t) => t.name).join(", ")}</span></>}
                      </td>
                    </>
                  )}
                  <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                  {tableQuestions.map((q) => <td key={q.id}>{answerText(r.custom_answers?.[q.id]) || <span className="muted">—</span>}</td>)}
                  <td className="small">
                    {!r.photo_consent && <span className="chip">No photos</span>} {r.under_18 && <span className="chip warn">Under 18 · {r.guardian_name}</span>}
                  </td>
                  {showVax && (
                    <td>
                      {(() => {
                        const dogs = Math.min(10, r.furbaby_count ?? 0);
                        if (!dogs) return <span className="muted">N/A</span>;
                        const missing = missingVaccinationCards(cardsOf.get(r.id) || [], dogs).length;
                        return missing ? <span className="chip warn">{missing === dogs ? "No card" : `${dogs - missing}/${dogs} cards`}</span> : <span className="chip good">{dogs > 1 ? `${dogs}/${dogs} cards` : "Card on file"}</span>;
                      })()}
                    </td>
                  )}
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
