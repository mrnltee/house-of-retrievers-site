import { sql } from "../../../lib/db";
import HowTo from "../HowTo";
import { PAGE_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { METHODS, METHOD_KEYS, formatMobile, maskAccountNumber, maskMobile } from "../../../lib/admin/payments.mjs";
import EditDialog from "../EditDialog";
import { cancelPaymentRequest, requestPaymentChange } from "../../actions";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";
import QrPicker from "./QrPicker";
import ConfirmButton from "../ConfirmButton";

/** The number as the public sees it (masked when that setting is on), or "" when there's no number. */
function publicNumber(live) {
  const d = live?.details || {};
  const n = d.number ? (d.maskNumber ? maskMobile(d.number) : formatMobile(d.number)) : d.accountNumber ? (d.maskNumber ? maskAccountNumber(d.accountNumber) : d.accountNumber) : "";
  return d.maskNumber ? n : "";
}

export default async function PaymentsPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("payments:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const [methods, pending] = await Promise.all([
    sql("SELECT * FROM payment_methods"),
    sql("SELECT id, method_key, requested_by, requested_at, enabled FROM payment_change_requests WHERE status='pending' ORDER BY requested_at"),
  ]);
  const byKey = Object.fromEntries(methods.map((m) => [m.key, m]));
  const pendingFor = Object.fromEntries(pending.map((p) => [p.method_key, p]));
  const canRequest = can(admin, "payments:request");

  return (
    <>
      <PageHead
        title="Payment settings"
        lead="How people pay HoR: the Support the pack panel, the payment step of paid events, and the bank and GCash lines in letters. A change goes live only after a different Owner approves it; switching a method off is immediate."
      ><HowTo guide={PAGE_GUIDES.payments[0]} guides={PAGE_GUIDES.payments} className="btn ghost" /></PageHead>
      <Flash params={params} />

      {pending.map((request) => (
        <div key={request.id} className="banner alert">
          <div>
            <strong>{METHODS[request.method_key].label} change waiting for approval</strong>
            <p className="small">Requested by {request.requested_by} · {formatWhen(request.requested_at)}. The current details stay on the site until a different Owner approves.</p>
          </div>
          <div className="actions">
            {(request.requested_by === admin.email || admin.roles.includes("owner")) && (
              <form action={cancelPaymentRequest}>
                <input type="hidden" name="id" value={request.id} />
                <ConfirmButton
                  className="btn ghost"
                  title={`Cancel the ${METHODS[request.method_key].label} change request?`}
                  items={["The pending request is removed", "The payment details currently on the site stay unchanged"]}
                  yes="Yes, cancel request"
                  tone="ghost"
                >Cancel request</ConfirmButton>
              </form>
            )}
            {admin.roles.includes("owner") && request.requested_by !== admin.email && <a className="btn" href={`${base}/payments/review/${request.id}`}>Review change</a>}
          </div>
        </div>
      ))}

      <h2>Payment methods</h2>
      <p className="muted">People copy the details or scan the QR and pay from their own app. No fees, nothing to connect. Each card shows what's live; Edit asks for a change.</p>
      <div className="grid-2 pay-methods">
        {METHOD_KEYS.map((key) => {
          const method = METHODS[key];
          const live = byKey[key];
          const waiting = pendingFor[key];
          return (
            <section key={key} className={`card pay-card${waiting ? " alert" : ""}`} aria-labelledby={`pay-${key}`}>
              <div className="pay-card-head">
                <h2 id={`pay-${key}`}>{method.label}</h2>
                <span className="actions">
                  {waiting && <span className="chip alert">Change waiting for approval</span>}
                  <span className={`chip ${live.enabled ? "good" : ""}`}>{live.enabled ? "Offered" : "Not offered"}</span>
                </span>
              </div>
              <div className="pay-card-body">
                {live.details && method.fields.some(([f]) => live.details?.[f]) ? (
                  <dl className="pay-details">
                    {method.fields.map(([field, label]) => live.details?.[field] ? (
                      <div key={field}><dt>{label}</dt><dd>{field === "number" ? formatMobile(live.details[field]) : live.details[field]}</dd></div>
                    ) : null)}
                    {publicNumber(live) && <div><dt>The public sees</dt><dd>{publicNumber(live)}</dd></div>}
                  </dl>
                ) : <p className="muted" style={{ margin: 0 }}>No details yet.</p>}
                {method.qr && <div className="qr-slot pay-qr">{live.qr_image ? <img src={live.qr_image} alt={`${method.label} QR code (live)`} /> : "No QR yet"}</div>}
              </div>
              <div className="pay-card-foot">
                <span className="small muted">{live.updated_at ? `Live since ${formatWhen(live.updated_at)}${live.approved_by ? ` · approved by ${live.approved_by}` : ""}` : "Nothing approved yet"}</span>
                {canRequest && !waiting && (
                  <EditDialog label={method.fields.some(([f]) => live.details?.[f]) ? "Edit" : "Add details"} buttonClass="btn ghost small" title={`${method.label} details`} lead="A new detail, the public number setting, or switching it on waits for a different Owner to approve. Switching it off is immediate.">
            <form action={requestPaymentChange} className="form pay-form">
              <input type="hidden" name="method" value={key} />
              <div className={method.qr ? "row-2" : "form"}>
                <div className="form">
                  {method.fields.map(([field, label]) => (
                    <label className="field" key={field}>
                      <span>{label}</span>
                      <input
                        type="text"
                        name={field}
                        disabled={!canRequest || Boolean(waiting)}
                        defaultValue={field === "number" ? formatMobile(live.details?.[field] || "") : live.details?.[field] || ""}
                        placeholder={field === "number" ? "09XX XXX XXXX" : "Not set"}
                      />
                    </label>
                  ))}
                  <label className="check">
                    <input type="checkbox" name="enabled" defaultChecked={live.enabled} disabled={!canRequest || Boolean(waiting)} />
                    Offer {method.label}: on the Support panel and at the payment step of paid events
                  </label>
                  {method.fields.some(([field]) => field === "number" || field === "accountNumber") && (
                    <label className="check">
                      <input type="checkbox" name="maskNumber" defaultChecked={Boolean(live.details?.maskNumber)} disabled={!canRequest || Boolean(waiting)} />
                      <span>Partly hide the number on the public site<br /><span className="small muted">e.g. mobile 091 •••••• 89, account 12 •••••• 90</span></span>
                    </label>
                  )}
                </div>
                {method.qr && (canRequest && !waiting ? <QrPicker name={method.label} current={live.qr_image} /> : (
                  <div className="qr-slot">{live.qr_image ? <img src={live.qr_image} alt={`${method.label} QR code (current)`} /> : "No QR yet"}</div>
                ))}
              </div>
              <div className="actions">
                {canRequest && !waiting && (
                  <ConfirmButton
                    className="btn"
                    title={`Request this ${method.label} change?`}
                    items={["Changing details, the public number visibility, or switching this method on waits for a different Owner to approve", `Switching ${method.label} off takes it off the Support panel and event payments immediately`, "The activity log records who requested it"]}
                    yes="Yes, request change"
                    tone="ink"
                  >Request change</ConfirmButton>
                )}
              </div>
            </form>
                  </EditDialog>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card">
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <h2>Online checkout</h2>
          <span className="chip">Phase 4</span>
        </div>
        <p className="muted">
          Card, GCash, Maya and QR Ph payments on the site itself. This opens once HOR&apos;s corporate bank account exists and a gateway such as PayMongo approves HOR.
          Secret keys go into Vercel and are never typed or shown here.
        </p>
        <p><span className="chip">PayMongo · not connected</span></p>
      </section>
    </>
  );
}
