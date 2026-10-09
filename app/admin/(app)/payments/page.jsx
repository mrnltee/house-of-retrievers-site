import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { METHODS, METHOD_KEYS, formatMobile } from "../../../lib/admin/payments.mjs";
import { cancelPaymentRequest, requestPaymentChange } from "../../actions";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";
import QrPicker from "./QrPicker";

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
  const canRequest = can(admin.roles, "payments:request");

  return (
    <>
      <PageHead
        title="Payment settings"
        lead="What the Support the pack panel shows. A change to any detail goes live only after a different Owner approves it. Switching a method off is immediate."
      />
      <Flash params={params} />

      {pending.map((request) => (
        <div key={request.id} className="banner alert">
          <div>
            <strong>{METHODS[request.method_key].label} change waiting for approval</strong>
            <p className="small">Requested by {request.requested_by} · {formatWhen(request.requested_at)}. The current details stay on the site until a different Owner approves.</p>
          </div>
          <div className="actions">
            {(request.requested_by === admin.email || admin.roles.includes("owner")) && (
              <form action={cancelPaymentRequest}><input type="hidden" name="id" value={request.id} /><button className="btn ghost">Cancel request</button></form>
            )}
            {admin.roles.includes("owner") && request.requested_by !== admin.email && <a className="btn" href={`${base}/payments/review/${request.id}`}>Review change</a>}
          </div>
        </div>
      ))}

      <h2>Manual methods</h2>
      <p className="muted">Donors copy the details or scan the QR and send from their own app. No fees, nothing to connect.</p>
      <div className="grid-2">
        {METHOD_KEYS.map((key) => {
          const method = METHODS[key];
          const live = byKey[key];
          const waiting = pendingFor[key];
          return (
            <form key={key} action={requestPaymentChange} className={`card ${waiting ? "alert" : ""}`}>
              <input type="hidden" name="method" value={key} />
              <div className="actions" style={{ justifyContent: "space-between" }}>
                <h2>{method.label}</h2>
                <div className="actions">
                  {waiting && <span className="chip alert">Change pending</span>}
                  <span className={`chip ${live.enabled ? "good" : ""}`}>{live.enabled ? "Shown on site" : "Hidden"}</span>
                </div>
              </div>
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
                    Show {method.label} on the Support panel
                  </label>
                </div>
                {method.qr && (canRequest && !waiting ? <QrPicker name={method.label} current={live.qr_image} /> : (
                  <div className="qr-slot">{live.qr_image ? <img src={live.qr_image} alt={`${method.label} QR code (current)`} /> : "No QR yet"}</div>
                ))}
              </div>
              <div className="actions" style={{ justifyContent: "space-between" }}>
                <span className="small muted">
                  {live.updated_at ? `Live since ${formatWhen(live.updated_at)}${live.approved_by ? ` · approved by ${live.approved_by}` : ""}` : "No details approved yet"}
                </span>
                {canRequest && !waiting && <button className="btn">Request change</button>}
              </div>
            </form>
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
