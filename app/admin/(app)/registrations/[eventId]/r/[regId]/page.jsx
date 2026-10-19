import { breedLabel } from "../../../../../../lib/breeds.mjs";
import { answerText, cleanCustomQuestions } from "../../../../../../lib/customQuestions.mjs";
import { notFound } from "next/navigation";
import { sql } from "../../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../../lib/admin/guard";
import { can } from "../../../../../../lib/admin/roles.mjs";
import { ADMIN_PAY_METHODS, FEE_STATUS, REJECT_REASONS, UNPAID, payMethodLabel, referenceKey, ticketLine } from "../../../../../../lib/eventPayments.mjs";
import { DEFAULT_REMINDER_HOLD_MINUTES, REMINDER_HOLD_OPTIONS, isActiveRegistrationHold, isExpiredHold } from "../../../../../../lib/registrationHolds.mjs";
import { WELCOME_PHOTO_SOURCE_LABELS } from "../../../../../../lib/welcomePhoto.mjs";
import { welcomePhotoFor } from "../../../../../../lib/welcomePhotos";
import WelcomeAvatar from "../../../WelcomeAvatar";
import BreedIcons from "../../../BreedIcons";
import BreedFields from "../../../BreedFields";
import CustomAnswerFields from "../../../CustomAnswerFields";
import WelcomePhotoField from "../../../WelcomePhotoField";
import { eventTiers } from "../../../../../../lib/admin/events.mjs";
import { calculateAmountDue, cleanPricingBasis, overpaidBy } from "../../../../../../lib/registrationPricing.mjs";
import { approvePayment, attachReceipt, correctPaidAmount, markPaid, recordRefund, rejectPayment, remindExpiredHolds, resendPass, updateRegistration } from "../../../../../registrationActions";
import ConfirmButton from "../../../../ConfirmButton";
import ReceiptField from "../../../ReceiptField";
import ImageLightbox from "../../../ImageLightbox";
import ReasonPicker from "../../../ReasonPicker";
import { Flash, NotAllowed, PageHead, formatWhen } from "../../../../ui";
import { EVENTS_URL } from "../../../../../../lib/eventsHost.mjs";

const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;

/**
 * One registration (Figma R2): their receipt beside what they typed, the
 * duplicate-reference check, and the actions, each confirmed in a dialog:
 * approve, ask for a new receipt, mark paid by hand, attach a receipt,
 * resend the pass.
 */
export default async function RegistrationDetail({ params, searchParams }) {
  const { eventId, regId } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("registrations:view");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(regId)) notFound();
  const [reg] = await sql(
    `SELECT r.*, e.title, e.fee_required, e.pricing_basis, e.price_tiers, e.cost, e.included_furbabies_per_human, e.additional_furbaby_fee, e.date, e.vaccination_record_required, e.rsvp_form_config FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = $1 AND r.event_id = $2`,
    [regId, eventId],
  );
  if (!reg) notFound();
  const base = await adminBase();
  const [proofs, twins, vaccinationRows, welcome] = await Promise.all([
    sql("SELECT id, uploaded_by, created_at, bytes FROM payment_proofs WHERE registration_id = $1 ORDER BY created_at DESC", [regId]),
    reg.fee_reference
      ? sql("SELECT id, name, status FROM registrations WHERE event_id = $1 AND id <> $2 AND status <> 'cancelled' AND deleted_at IS NULL AND regexp_replace(upper(fee_reference), '[^A-Z0-9]', '', 'g') = $3", [eventId, regId, referenceKey(reg.fee_reference)])
      : [],
    sql("SELECT furbaby_index, uploaded_at, bytes FROM registration_vaccination_records WHERE registration_id = $1 ORDER BY furbaby_index", [regId]),
    reg.deleted_at ? null : welcomePhotoFor(regId, eventId),
  ]);
  const proof = proofs[0];
  const dogNames = String(reg.furbaby_name || "").split(/,\s*/);
  const dogLabel = (i) => [dogNames[i] || (reg.furbaby_count > 1 ? `Furbaby ${i + 1}` : "Furbaby"), breedLabel(reg.furbaby_breeds?.[i] || "")].filter(Boolean).join(" · ");
  const canFees = can(admin.roles, "registrations:fees");
  const canEdit = can(admin.roles, "registrations:edit");
  const fee = FEE_STATUS[reg.fee_status] || FEE_STATUS.not_due;
  const owing = reg.fee_required && reg.status === "confirmed" && UNPAID.includes(reg.fee_status);
  const due = reg.amount_due ?? reg.ticket_amount;
  const tiers = reg.fee_required ? eventTiers(reg) : [];
  const selectedTier = tiers.findIndex((tier) => tier.label === reg.ticket_label && Number(tier.amount) === Number(reg.ticket_amount));
  // A refund already recorded comes off what they paid before comparing with the amount due.
  const netPaid = reg.pay_amount == null ? null : Number(reg.pay_amount) - Number(reg.refund_amount || 0);
  const amountOk = due == null || netPaid == null ? null : netPaid === Number(due);
  // What today's prices say they owe (e.g. pair pricing), to spot an overpayment to refund.
  const currentTier = tiers[selectedTier];
  const currentDue = currentTier ? calculateAmountDue({ basis: cleanPricingBasis(reg.pricing_basis), tier: currentTier, humans: reg.human_count ?? 1, furbabies: reg.furbaby_count ?? 0, includedFurbabiesPerHuman: reg.included_furbabies_per_human, additionalFurbabyFee: reg.additional_furbaby_fee }) : null;
  const overpaid = reg.fee_status === "paid" && currentDue && !currentDue.error ? overpaidBy({ payAmount: reg.pay_amount, due: currentDue.amount, refunded: reg.refund_amount }) : 0;
  const holdExpired = reg.fee_status === "waiting" && !isActiveRegistrationHold({ feeStatus: reg.fee_status, holdExpiresAt: reg.hold_expires_at });
  const back = `${base}/registrations/${eventId}${reg.fee_status === "review" ? "?show=check" : ""}`;
  // Previous / next follow the registrations list's order (oldest first). Cancelled
  // ones are skipped like the list's "All" tab, unless this one is cancelled itself.
  const siblings = await sql(
    `SELECT id, name FROM registrations WHERE event_id = $1 AND deleted_at IS NULL AND (status <> 'cancelled' OR id = $2) ORDER BY created_at, id`,
    [eventId, regId],
  );
  const at = siblings.findIndex((r) => r.id === regId);
  const prev = at > 0 ? siblings[at - 1] : null;
  const next = at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : null;
  const regHref = (r) => `${base}/registrations/${eventId}/r/${r.id}`;

  return (
    <>
      <ImageLightbox />
      <nav className="reg-pager" aria-label="Registrations">
        <a className="small" href={back}>← {reg.title} registrations</a>
        {at >= 0 && siblings.length > 1 && (
          <span className="reg-pager-steps">
            {prev ? <a className="btn ghost small" href={regHref(prev)} rel="prev" title={prev.name}><span className="reg-pager-label">← Previous<span className="reg-pager-name">: {prev.name}</span></span></a> : <span className="btn ghost small" aria-disabled="true">← Previous</span>}
            <span className="small muted">{at + 1} of {siblings.length}</span>
            {next ? <a className="btn ghost small" href={regHref(next)} rel="next" title={next.name}><span className="reg-pager-label">Next<span className="reg-pager-name">: {next.name}</span> →</span></a> : <span className="btn ghost small" aria-disabled="true">Next →</span>}
          </span>
        )}
      </nav>
      <PageHead title={reg.name} lead={[reg.email, `RSVP'd ${formatWhen(reg.created_at)}`, reg.added_by ? `added by ${reg.added_by}` : "", reg.proof_at ? `receipt ${formatWhen(reg.proof_at)}` : ""].filter(Boolean).join(" · ")} />
      <Flash params={query} />

      <div className="grid-2 check-grid">
        <section className="card receipt-card" aria-label="Receipt">
          {proof ? (
            <>
              <a href={`${base}/registrations/proof/${proof.id}`} target="_blank" rel="noreferrer" className="receipt-shot" data-lightbox={`${reg.name}'s payment receipt`}>
                <img src={`${base}/registrations/proof/${proof.id}`} alt={`Payment screenshot from ${reg.name}`} />
              </a>
              <p className="small muted">Uploaded by {proof.uploaded_by} · {formatWhen(proof.created_at)} · <a href={`${base}/registrations/proof/${proof.id}`} target="_blank" rel="noreferrer" data-lightbox={`${reg.name}'s payment receipt`}>Open full size</a>{proofs.length > 1 ? ` · ${proofs.length - 1} earlier upload${proofs.length > 2 ? "s" : ""} kept` : ""}</p>
            </>
          ) : (
            <p className="muted">{reg.fee_required ? "No receipt uploaded yet." : "This event has no fee."}</p>
          )}
        </section>

        <div className="form" style={{ gap: 20 }}>
          <section className="card form" style={{ gap: 12 }}>
            <div className="actions" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>{reg.fee_required ? "Payment" : "Registration"}</h2>
              {reg.fee_required && reg.status === "confirmed" && <span className={`chip ${fee.tone}`}>{fee.label}</span>}
            </div>
            <dl className="facts">
              <div><dt>Status</dt><dd>{reg.status === "confirmed" ? (reg.checked_in_at ? `Checked in ${formatWhen(reg.checked_in_at)}` : "Confirmed") : reg.status === "waitlist" ? "Waitlist" : "Cancelled"}</dd></div>
              {reg.fee_required && <div><dt>Ticket</dt><dd>{ticketLine(reg.ticket_label, reg.ticket_amount) || "—"}</dd></div>}
              {reg.fee_required && <div><dt>Amount due</dt><dd>{due != null ? peso(due) : "—"}</dd></div>}
              <div><dt>People</dt><dd>{reg.human_count ?? 1}</dd></div>
              {reg.guest_names?.some(Boolean) && <div><dt>With</dt><dd>{reg.guest_names.filter(Boolean).join(", ")}</dd></div>}
              <div><dt>Furbabies</dt><dd>{reg.furbaby_count ?? 0}</dd></div>
              {reg.pay_method && <div><dt>Paid with</dt><dd>{payMethodLabel(reg.pay_method)}</dd></div>}
              {reg.fee_reference && <div><dt>Reference number</dt><dd><strong className="mono">{reg.fee_reference}</strong></dd></div>}
              {reg.pay_amount != null && <div><dt>They entered</dt><dd className={amountOk === false ? "danger-text" : amountOk ? "good-text" : ""}>{peso(reg.pay_amount)}{amountOk === false ? " · doesn't match" : ""}</dd></div>}
              {reg.refund_amount && <div><dt>Refunded</dt><dd>{peso(reg.refund_amount)} · {payMethodLabel(reg.refund_method)} · Ref <span className="mono">{reg.refund_reference}</span><br /><span className="small muted">{reg.refunded_by} · {formatWhen(reg.refunded_at)}</span></dd></div>}
              {reg.fee_checked_by && <div><dt>{reg.fee_status === "paid" ? "Approved by" : "Last checked by"}</dt><dd>{reg.fee_checked_by} · {formatWhen(reg.fee_checked_at)}</dd></div>}
              {reg.pass_sent_at && <div><dt>QR pass emailed</dt><dd>{formatWhen(reg.pass_sent_at)}</dd></div>}
              {reg.furbaby_name && <div><dt>Furbaby</dt><dd>{reg.furbaby_name}</dd></div>}
              {reg.furbaby_breeds?.some(Boolean) && <div><dt>{reg.furbaby_breeds.filter(Boolean).length > 1 ? "Breeds" : "Breed"}</dt><dd><BreedIcons breeds={reg.furbaby_breeds} size={24} withNames /></dd></div>}
              {cleanCustomQuestions(reg.rsvp_form_config?.questions).map((q) => <div key={q.id}><dt>{q.label}</dt><dd>{answerText(reg.custom_answers?.[q.id]) || "Not asked"}</dd></div>)}
              <div><dt>Photos</dt><dd>{reg.photo_consent ? "OK" : "No photos"}</dd></div>
              {reg.under_18 && <div><dt>Under 18</dt><dd>Guardian: {reg.guardian_name}</dd></div>}
              {reg.rsvp_form_config?.consentEnabled && <div><dt>Event acknowledgement</dt><dd>{reg.consent_completed_at ? `Completed ${formatWhen(reg.consent_completed_at)}${reg.consent_name ? ` · ${reg.consent_name}` : ""}` : "Not completed"}</dd></div>}
            </dl>
            {holdExpired && <p className="banner alert small" style={{ margin: 0 }}><span>This payment hold expired, so the slot no longer counts toward capacity. Approving or marking it paid will recheck that there's still room.</span></p>}
            {reg.fee_status === "rejected" && reg.fee_note && <p className="banner note small" style={{ margin: 0 }}><span>Asked for a new receipt: “{reg.fee_note}”</span></p>}
            {reg.fee_reference && (twins.length ? (
              <p className="banner alert small" style={{ margin: 0 }}><span>⚠ Same reference as {twins.map((t, i) => <span key={t.id}>{i ? ", " : ""}<a href={`${base}/registrations/${eventId}/r/${t.id}`}>{t.name}</a></span>)}. One payment may have been sent twice.</span></p>
            ) : (
              <p className="banner ok small" style={{ margin: 0 }}>✓ No other registration for this event uses this reference.</p>
            ))}
          </section>

          {(reg.vaccination_record_required || vaccinationRows.length > 0) && (
            <section className="card vaccination-card" aria-label="Vaccination records">
              <h2>{vaccinationRows.length > 1 ? "Vaccination records" : "Vaccination record"}</h2>
              {vaccinationRows.length ? <div className="vaccination-grid">{vaccinationRows.map((v) => {
                const src = `${base}/registrations/vaccination/${reg.id}?i=${v.furbaby_index}`;
                return (
                  <figure key={v.furbaby_index}>
                    <figcaption className="strong">{dogLabel(v.furbaby_index)}</figcaption>
                    <a href={src} target="_blank" rel="noreferrer" className="vaccination-shot" data-lightbox={`Vaccination card · ${dogLabel(v.furbaby_index)}`}><img src={src} alt={`Vaccination record for ${dogLabel(v.furbaby_index)}`} loading="lazy" /></a>
                    <p className="small muted">Uploaded {formatWhen(v.uploaded_at)} · <a href={src} target="_blank" rel="noreferrer" data-lightbox={`Vaccination card · ${dogLabel(v.furbaby_index)}`}>Open full size</a></p>
                  </figure>
                );
              })}</div> : <p className="muted">No vaccination record was uploaded.</p>}
            </section>
          )}

          {welcome && (
            <section className="card form" style={{ gap: 12 }} aria-label="Welcome photo">
              <h2 style={{ margin: 0 }}>Welcome photo</h2>
              <p className="small muted" style={{ margin: 0 }}>What the door screen shows when {reg.name} checks in.</p>
              <div className="actions" style={{ alignItems: "center" }}>
                <WelcomeAvatar base={base} eventId={eventId} registrationId={reg.id} resolved={welcome} size={96} />
                <span className="small">{WELCOME_PHOTO_SOURCE_LABELS[welcome.source]}</span>
              </div>
              {canEdit && (
                <WelcomePhotoField registrationId={reg.id} name={reg.name} source={welcome.source} hasMatch={Boolean(welcome.personId)} matchPhotoId={welcome.matchPhotoId} canSaveToPerson={can(admin.roles, "people:edit")} />
              )}
            </section>
          )}

          {canEdit && (
            <section className="card form" style={{ gap: 12 }}>
              <h2 style={{ margin: 0 }}>Edit registration</h2>
              <p className="small muted">Update the attendee details or counts. Saving does not email them unless you tick the box below. A paid registration can be recalculated only when the payment already matches the new amount.</p>
              <form action={updateRegistration} className="form" style={{ gap: 12 }}>
                <input type="hidden" name="id" value={reg.id} />
                <div className="row-2">
                  <label className="field"><span>Name</span><input name="name" required maxLength={120} defaultValue={reg.name} /></label>
                  <label className="field"><span>Email</span><input name="email" type="email" required maxLength={200} defaultValue={reg.email} /></label>
                </div>
                <div className="row-2">
                  <label className="field"><span>Furbaby&apos;s name <small>Optional</small></span><input name="furbabyName" maxLength={120} defaultValue={reg.furbaby_name || ""} /></label>
                  <div className="row-2">
                    <label className="field"><span>People</span><input name="humanCount" type="number" min="1" max="100" required defaultValue={reg.human_count ?? 1} /></label>
                    <label className="field"><span>Furbabies</span><input name="furbabyCount" type="number" min="0" max="100" required defaultValue={reg.furbaby_count ?? 0} /></label>
                  </div>
                </div>
                <BreedFields initial={reg.furbaby_breeds || []} count={Math.min(4, Math.max(1, reg.furbaby_count ?? 1))} />
                <CustomAnswerFields config={reg.rsvp_form_config} answers={reg.custom_answers} />
                {reg.fee_required && tiers.length > 0 && <label className="field"><span>Ticket</span>
                  <select name="ticket" defaultValue={selectedTier >= 0 ? String(selectedTier) : ""} required={tiers.length > 1}>
                    {tiers.length > 1 && <option value="">Choose…</option>}
                    {tiers.map((tier, index) => <option key={index} value={index}>{ticketLine(tier.label, tier.amount)}</option>)}
                  </select>
                </label>}
                <label className="check"><input type="checkbox" name="photoConsent" defaultChecked={reg.photo_consent} /> <span>Photos of them are OK</span></label>
                <label className="check"><input type="checkbox" name="under18" defaultChecked={reg.under_18} /> <span>Under 18</span></label>
                {reg.under_18 && <label className="field"><span>Guardian&apos;s name</span><input name="guardianName" maxLength={120} defaultValue={reg.guardian_name || ""} /></label>}
                <label className="check"><input type="checkbox" name="sendEmail" /> <span>Send the updated confirmation or payment instructions after saving</span></label>
                <div className="actions"><ConfirmButton title={`Save ${reg.name}'s registration changes?`} items={["Their registration details and attendee count are updated", "No email is sent unless you ticked the email box", ...(reg.fee_status === "paid" ? ["The paid status, payment amount, reference and QR pass stay unchanged"] : [])]} yes="Yes, save changes">Save changes</ConfirmButton></div>
              </form>
            </section>
          )}

          {canFees && isExpiredHold(reg) && (
            <section className="card form" style={{ gap: 12 }}>
              <h2 style={{ margin: 0 }}>Payment hold expired</h2>
              <p className="small muted">Their time to pay ran out {formatWhen(reg.hold_expires_at)}{reg.hold_reminders ? ` · reminded ${reg.hold_reminders}× (last ${formatWhen(reg.hold_reminded_at)})` : ""}. A reminder holds the spot again if there&apos;s still room, and emails {reg.email} their payment link with the new deadline.</p>
              <form action={remindExpiredHolds} className="form" style={{ gap: 12 }}>
                <input type="hidden" name="id" value={reg.id} />
                <label className="field"><span>Hold their spot again for</span>
                  <select name="minutes" defaultValue={DEFAULT_REMINDER_HOLD_MINUTES}>{REMINDER_HOLD_OPTIONS.map(([m, label]) => <option key={m} value={m}>{label}</option>)}</select>
                </label>
                <div className="actions"><ConfirmButton className="btn gold" title={`Send ${reg.name} a payment reminder?`} items={["If there's still room, their spot is held again for the time you picked", `${reg.email} is emailed their payment link and the new deadline`, "If there's no room left, nothing is sent and you'll see why"]} yes="Yes, send reminder">Send payment reminder</ConfirmButton></div>
              </form>
            </section>
          )}

          {canFees && overpaid > 0 && (
            <section className="card form" style={{ gap: 12 }}>
              <h2 style={{ margin: 0 }}>Overpaid {peso(overpaid)}</h2>
              <p className="small muted">They paid {peso(reg.pay_amount)}{reg.refund_amount ? ` (${peso(reg.refund_amount)} already refunded)` : ""}, but today&apos;s prices make it {peso(currentDue.amount)} for {reg.human_count ?? 1} {(reg.human_count ?? 1) === 1 ? "hooman" : "hoomans"} and {reg.furbaby_count ?? 0} {(reg.furbaby_count ?? 0) === 1 ? "furbaby" : "furbabies"}. Send {peso(overpaid)} back to them first, then record it here.</p>
              <form action={recordRefund} className="form" style={{ gap: 12 }}>
                <input type="hidden" name="id" value={reg.id} />
                <div className="row-2">
                  <label className="field"><span>Sent back with</span>
                    <select name="method" required defaultValue={reg.pay_method || ""}>
                      <option value="" disabled>Choose…</option>
                      {Object.entries(ADMIN_PAY_METHODS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Refund reference number</span><input name="reference" required maxLength={60} /></label>
                </div>
                <label className="check"><input type="checkbox" name="sent" required /> <span>I&apos;ve sent {peso(overpaid)} back to {reg.name}</span></label>
                <div className="actions"><ConfirmButton className="btn ghost" title={`Record a ${peso(overpaid)} refund for ${reg.name}?`} items={[`Refund: ${peso(overpaid)}`, `Amount due: ${peso(due)} → ${peso(currentDue.amount)}`, "They stay Paid; their payment record, receipt and QR pass are kept", "Nothing is emailed"]} yes="Yes, record refund">Record refund</ConfirmButton></div>
              </form>
            </section>
          )}

          {canFees && reg.fee_status === "paid" && amountOk === false && overpaid === 0 && (
            <section className="card form" style={{ gap: 12 }}>
              <h2 style={{ margin: 0 }}>Correct the saved amount</h2>
              <p className="small muted">The payment record says {peso(reg.pay_amount)}, but this registration saved a different amount due. This changes only the saved amount due so the records agree.</p>
              <form action={correctPaidAmount} className="form" style={{ gap: 12 }}>
                <input type="hidden" name="id" value={reg.id} />
                <label className="field"><span>Correct amount due <small>₱</small></span><input name="amount" type="text" inputMode="decimal" required defaultValue={reg.pay_amount ?? ""} /></label>
                <div className="actions"><ConfirmButton className="btn ghost" title={`Correct ${reg.name}'s saved amount?`} items={[`Amount due: ${peso(due)} → ${peso(reg.pay_amount)}`, "Paid status, payment amount, reference, receipt and QR pass stay unchanged", "Nothing is emailed"]} yes="Yes, correct amount">Correct saved amount</ConfirmButton></div>
              </form>
            </section>
          )}

          {canFees && owing && reg.fee_status === "review" && (
            <section className="card form" style={{ gap: 14 }}>
              <h2 style={{ margin: 0 }}>Check it</h2>
              <form action={approvePayment} className="form" style={{ gap: 12 }}>
                <input type="hidden" name="id" value={reg.id} />
                <label className="check"><input type="checkbox" name="matched" required /> <span>I found reference <strong>{reg.fee_reference}</strong>{reg.pay_amount != null ? <> and {peso(reg.pay_amount)}</> : null} in HOR&apos;s {payMethodLabel(reg.pay_method) || "payment"} history.</span></label>
                <div className="actions">
                  <ConfirmButton
                    title={`Approve ${reg.name}'s payment?`}
                    items={[
                      `Payment: To check → Paid (${[payMethodLabel(reg.pay_method), `Ref ${reg.fee_reference}`, reg.pay_amount != null ? peso(reg.pay_amount) : ""].filter(Boolean).join(" · ")})`,
                      `Their QR pass is emailed to ${reg.email}`,
                      `You (${admin.email}) are recorded as the person who checked it`,
                    ]}
                    note={amountOk === false ? `The amount they entered doesn't match the ticket (${peso(due)}).` : "Only approve if you found this reference and amount in HOR's payment history."}
                    yes="Yes, approve and send"
                  >Approve and email QR pass</ConfirmButton>
                </div>
              </form>
            </section>
          )}

          {canFees && owing && (reg.fee_status === "review" || reg.fee_status === "waiting") && (
            <details className="card disclosure-card">
              <summary><h2>Ask for a new receipt</h2></summary>
              <form action={rejectPayment} className="form" style={{ gap: 12, marginTop: 12 }}>
                <input type="hidden" name="id" value={reg.id} />
                <ReasonPicker reasons={REJECT_REASONS} />
                <div className="actions">
                  <ConfirmButton
                    className="btn ghost"
                    title={`Ask ${reg.name} for a new receipt?`}
                    echo={[{ name: "reason", label: "They'll read" }]}
                    items={[`Payment → New receipt asked`, `Your reason is emailed to ${reg.email}`, "Their spot stays held; they can upload again from their RSVP page"]}
                    yes="Yes, ask them"
                    tone="ghost"
                  >Ask for a new receipt</ConfirmButton>
                </div>
              </form>
            </details>
          )}

          {canFees && owing && (
            <details className="card disclosure-card">
              <summary><h2>Mark paid by hand</h2></summary>
              <p className="small muted">For cash, or a payment you matched another way (no screenshot needed).</p>
              <form action={markPaid} className="form" style={{ gap: 12 }}>
                <input type="hidden" name="id" value={reg.id} />
                <div className="row-2">
                  <label className="field"><span>Paid with</span>
                    <select name="method" defaultValue={reg.pay_method || ""} required>
                      <option value="">Choose…</option>
                      {Object.entries(ADMIN_PAY_METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Amount <small>₱</small></span><input type="text" name="amount" inputMode="decimal" defaultValue={reg.pay_amount ?? due ?? ""} /></label>
                </div>
                <label className="field"><span>Reference number <small>Not needed for cash</small></span><input type="text" name="reference" maxLength={40} defaultValue={reg.fee_reference || ""} /></label>
                <div className="actions">
                  <ConfirmButton
                    className="btn ghost"
                    title={`Mark ${reg.name} paid?`}
                    echo={[{ name: "method", label: "Paid with" }, { name: "reference", label: "Reference" }, { name: "amount", label: "Amount (₱)" }]}
                    items={[`Payment → Paid, recorded under your name`, `Their QR pass is emailed to ${reg.email}`]}
                    yes="Yes, mark paid and send"
                  >Mark paid</ConfirmButton>
                </div>
              </form>
            </details>
          )}

          {canFees && reg.fee_required && reg.status === "confirmed" && (
            <details className="card disclosure-card">
              <summary><h2>{proof ? "Replace the receipt" : "Attach a receipt"}</h2></summary>
              <p className="small muted">For a receipt they sent you by chat. The earlier one is kept.</p>
              <form action={attachReceipt} className="form" style={{ gap: 12 }}>
                <input type="hidden" name="id" value={reg.id} />
                <ReceiptField required />
                <div className="row-2">
                  <label className="field"><span>Paid with</span>
                    <select name="method" defaultValue={reg.pay_method || ""} required>
                      <option value="">Choose…</option>
                      {Object.entries(ADMIN_PAY_METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Amount <small>₱</small></span><input type="text" name="amount" inputMode="decimal" defaultValue={reg.pay_amount ?? due ?? ""} /></label>
                </div>
                <label className="field"><span>Reference number</span><input type="text" name="reference" maxLength={40} defaultValue={reg.fee_reference || ""} /></label>
                <div className="actions">
                  <ConfirmButton
                    className="btn ghost"
                    title={proof ? "Replace the receipt?" : "Attach this receipt?"}
                    echo={[{ name: "method", label: "Paid with" }, { name: "reference", label: "Reference" }]}
                    items={[reg.fee_status === "paid" ? "The receipt is saved; the payment stays Paid" : "Payment → To check, ready for someone to approve", "Nothing is emailed"]}
                    yes="Yes, save it"
                  >Save receipt</ConfirmButton>
                </div>
              </form>
            </details>
          )}

          {canEdit && reg.status === "confirmed" && !(reg.fee_required && UNPAID.includes(reg.fee_status)) && (
            <form action={resendPass} className="card form" style={{ gap: 10 }}>
              <input type="hidden" name="id" value={reg.id} />
              <h2 style={{ margin: 0 }}>QR pass</h2>
              <p className="small muted">{reg.pass_sent_at ? `Last emailed ${formatWhen(reg.pass_sent_at)}.` : "Not emailed yet."} Their pass link: <a href={`${EVENTS_URL}/r/${reg.check_in_code}`} target="_blank" rel="noreferrer">open</a></p>
              <div className="actions">
                <ConfirmButton className="btn ghost" title="Email the QR pass again?" items={[`Their pass is emailed to ${reg.email}`]} yes="Yes, send it">Resend QR pass</ConfirmButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
