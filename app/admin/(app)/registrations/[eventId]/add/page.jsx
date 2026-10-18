import { notFound } from "next/navigation";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { eventTiers } from "../../../../../lib/admin/events.mjs";
import { tierLeft, tierWindow } from "../../../../../lib/prices.mjs";
import { TICKET_COUNTS_SQL, countsFromRows } from "../../../../../lib/ticketCounts.mjs";
import { ADMIN_PAY_METHODS, ticketLine } from "../../../../../lib/eventPayments.mjs";
import { calculateAmountDue } from "../../../../../lib/registrationPricing.mjs";
import { CAPACITY_USED_SQL, capacityUnitLabel } from "../../../../../lib/eventCapacity.mjs";
import { emailReady } from "../../../../../lib/email";
import BreedFields from "../../BreedFields";
import CustomAnswerFields from "../../CustomAnswerFields";
import { addRegistration } from "../../../../registrationActions";
import ConfirmButton from "../../../ConfirmButton";
import ReceiptField from "../../ReceiptField";
import { Flash, NotAllowed, PageHead } from "../../../ui";

/**
 * Add someone by hand (Figma R3): people who paid before the system, at the
 * door, or guests. Confirmed straight away; over capacity is allowed.
 */
export default async function AddRegistration({ params, searchParams }) {
  const { eventId } = await params;
  const query = await searchParams;
  const { allowed } = await pageAdmin("registrations:edit");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const [event] = await sql("SELECT * FROM events WHERE id = $1", [eventId]);
  if (!event) notFound();
  const base = await adminBase();
  const [{ used }] = await sql(`SELECT ${CAPACITY_USED_SQL} AS used FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.event_id = $1 AND r.status = 'confirmed' AND r.deleted_at IS NULL AND (r.fee_status <> 'waiting' OR r.hold_expires_at IS NULL OR r.hold_expires_at > now())`, [eventId]);
  const tiers = event.fee_required ? eventTiers(event) : [];
  const counts = tiers.some((t) => t.limit) ? countsFromRows(await sql(TICKET_COUNTS_SQL, [eventId])) : {};
  const capacityUsed = Number(used || 0);
  const full = event.capacity != null && capacityUsed >= event.capacity;
  const ready = emailReady();
  const existing = await sql("SELECT name, email FROM registrations WHERE event_id=$1 AND deleted_at IS NULL", [eventId]);
  const defaultTier = tiers[0] || { amount: 0 };
  const defaultDue = calculateAmountDue({ basis: event.pricing_basis, tier: defaultTier, humans: 1, furbabies: 0, includedFurbabiesPerHuman: event.included_furbabies_per_human, additionalFurbabyFee: event.additional_furbaby_fee }).amount;

  return (
    <>
      <p className="small"><a href={`${base}/registrations/${eventId}`}>← {event.title} registrations</a></p>
      <PageHead title="Add a registration" lead={`For people who already paid, paid at the door, or guests. Capacity: ${capacityUsed} ${capacityUnitLabel(event.capacity_basis)} of ${event.capacity ?? "no limit"} used${full ? ", so adding goes over" : ""}.`} />
      <Flash params={query} />
      <form action={addRegistration} className="card form" style={{ maxWidth: 720, gap: 16 }}>
        <input type="hidden" name="eventId" value={eventId} />
        <div className="row-2">
          <label className="field"><span>Name</span><input type="text" name="name" required maxLength={120} /></label>
          <label className="field"><span>Email</span><input type="email" name="email" required maxLength={200} /></label>
        </div>
        <div className="row-2">
          <label className="field"><span>People attending</span><input type="number" name="humanCount" min={1} max={100} defaultValue="1" required /></label>
          <label className="field"><span>Furbabies attending</span><input type="number" name="furbabyCount" min={0} max={100} defaultValue="0" required /></label>
        </div>
          <BreedFields />
          <CustomAnswerFields config={event.rsvp_form_config} />
        <div className="row-2">
          <label className="field"><span>Furbaby&apos;s name <small>Optional</small></span><input type="text" name="furbabyName" maxLength={120} /></label>
          {tiers.length > 0 ? (
            <label className="field"><span>Ticket</span>
              <select name="ticket" required={tiers.length > 1} defaultValue={tiers.length === 1 ? "0" : ""}>
                {tiers.length > 1 && <option value="">Choose…</option>}
                {tiers.map((t, i) => <option key={i} value={i}>{ticketLine(t.label, t.amount)}{t.limit ? ` · ${t.limit - (tierLeft(t, counts) ?? 0)}/${t.limit} taken` : ""}{tierWindow(t) ? ` · ${tierWindow(t)}` : ""}</option>)}
              </select>
            </label>
          ) : <div />}
        </div>
        {event.fee_required && (
          <>
            <fieldset className="plain">
              <legend>Payment</legend>
              <label className="check"><input type="radio" name="payment" value="paid" defaultChecked /> <span><strong>Paid</strong> <span className="small muted">They already paid. Type the details below.</span></span></label>
              <label className="check"><input type="radio" name="payment" value="pending" /> <span><strong>Pending</strong> <span className="small muted">Hold the spot; they pay and upload like everyone else</span></span></label>
              <label className="check"><input type="radio" name="payment" value="none" /> <span><strong>No fee</strong> <span className="small muted">Guest, volunteer or sponsor</span></span></label>
            </fieldset>
            <div className="row-2">
              <label className="field"><span>Paid with <small>If paid</small></span>
                <select name="method" defaultValue="">
                  <option value="">Choose…</option>
                  {Object.entries(ADMIN_PAY_METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className="field"><span>Reference number <small>If paid, not needed for cash</small></span><input type="text" name="reference" maxLength={40} /></label>
            </div>
            <label className="field"><span>Amount <small>₱, if different from the ticket</small></span><input type="text" name="amount" inputMode="decimal" /></label>
            <ReceiptField label="Their receipt" hint="Optional" />
          </>
        )}
        <label className="check"><input type="checkbox" name="photoConsent" defaultChecked /> <span>Photos of them are OK</span></label>
        <label className="check"><input type="checkbox" name="under18" /> <span>Under 18 (comes with a guardian)</span></label>
        <label className="field"><span>Guardian&apos;s name <small>Only for under 18s</small></span><input type="text" name="guardianName" maxLength={120} /></label>
        <label className="check"><input type="checkbox" name="sendEmail" defaultChecked={ready} disabled={!ready} /> <span>Email them now: the QR pass (paid or no fee), or how to pay (pending){!ready && <span className="small muted"> · switches on once the Resend key is in Vercel</span>}</span></label>
        <div className="actions">
          <ConfirmButton
            title={`Add them to ${event.title}?`}
            echo={[{ name: "name", label: "Name" }, { name: "email", label: "Email" }, ...(tiers.length ? [{ name: "ticket", label: "Ticket" }] : []), ...(event.fee_required ? [{ name: "payment", label: "Payment" }, { name: "reference", label: "Reference" }] : [])]}
            items={[
              full ? `They're confirmed, which puts the event over capacity (${capacityUsed} of ${event.capacity})` : "They're confirmed and take a slot",
              "If the email box is ticked, they're emailed now",
              event.pricing_basis !== "registration" ? `The amount is calculated from the people/furbaby count (${defaultDue ? `₱${defaultDue}` : "free"} for one person)` : "The ticket price is saved with this registration",
            ]}
            yes="Yes, add them"
            duplicateEntries={existing}
          >Add registration</ConfirmButton>
          <a className="btn ghost" href={`${base}/registrations/${eventId}`}>Cancel</a>
        </div>
      </form>
    </>
  );
}
