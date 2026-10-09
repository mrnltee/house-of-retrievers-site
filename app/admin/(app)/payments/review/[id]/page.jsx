import { notFound } from "next/navigation";
import { sql } from "../../../../../lib/db";
import { pageAdmin } from "../../../../../lib/admin/guard";
import { canApprovePaymentChange, signedInRecently } from "../../../../../lib/admin/roles.mjs";
import { METHODS, diffChange, formatMobile } from "../../../../../lib/admin/payments.mjs";
import { approvePaymentRequest, rejectPaymentRequest } from "../../../../actions";
import { Flash, NotAllowed, PageHead, formatWhen } from "../../../ui";

export default async function ReviewPaymentChange({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("payments:approve");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [request] = await sql("SELECT * FROM payment_change_requests WHERE id=$1", [id]);
  if (!request) notFound();
  const [live] = await sql("SELECT * FROM payment_methods WHERE key=$1", [request.method_key]);
  const method = METHODS[request.method_key];
  const changed = new Set(diffChange(
    { enabled: live.enabled, details: live.details, qrImage: live.qr_image },
    { enabled: request.enabled, details: request.details, qrImage: request.qr_image },
  ));
  const mayDecide = request.status === "pending" && canApprovePaymentChange({ requestedBy: request.requested_by, approverEmail: admin.email, approverRoles: admin.roles });
  const show = (field, value) => (field === "number" ? formatMobile(value || "") : value) || "Not set";

  return (
    <>
      <PageHead title={`Approve the ${method.label} change?`} lead={`Requested by ${request.requested_by} · ${formatWhen(request.requested_at)}. Check the new details against HOR's own records, not only the message that asked for the change.`} />
      <Flash params={query} />
      {request.status !== "pending" && <p className="banner note">This request is {request.status}.</p>}
      {request.status === "pending" && !mayDecide && <p className="banner alert">A different Owner from the one who asked has to decide this.</p>}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Field</th><th>Live now</th><th>Requested</th></tr></thead>
          <tbody>
            <tr style={changed.has("enabled") ? { background: "rgba(167,132,64,.16)" } : undefined}>
              <td className="strong">Shown on the site</td><td>{live.enabled ? "Yes" : "No"}</td><td className={changed.has("enabled") ? "strong" : ""}>{request.enabled ? "Yes" : "No"}</td>
            </tr>
            {method.fields.map(([field, label]) => (
              <tr key={field} style={changed.has(field) ? { background: "rgba(167,132,64,.16)" } : undefined}>
                <td className="strong">{label}</td><td>{show(field, live.details?.[field])}</td><td className={changed.has(field) ? "strong" : ""}>{show(field, request.details?.[field])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {method.qr && (
        <div className="grid-2">
          <div className="card">
            <strong>QR live now</strong>
            <div className="qr-slot" style={{ width: 200 }}>{live.qr_image ? <img src={live.qr_image} alt="Current QR code" /> : "No QR on the site yet"}</div>
          </div>
          <div className={`card ${changed.has("qrImage") ? "alert" : ""}`}>
            <strong>QR requested</strong>
            <div className="qr-slot" style={{ width: 200 }}>{request.qr_image ? <img src={request.qr_image} alt="Requested QR code" /> : "No new QR (keeps the current one)"}</div>
            {request.qr_payload && (
              <p className="small">Scans to: <code style={{ wordBreak: "break-all" }}>{request.qr_payload}</code></p>
            )}
          </div>
        </div>
      )}

      {mayDecide && (
        <form action={approvePaymentRequest} className="card">
          <input type="hidden" name="id" value={request.id} />
          <label className="check">
            <input type="checkbox" name="confirmed" />
            I confirmed these details with HOR&apos;s own account records, not only with the requester.
          </label>
          <p className="small muted">
            {signedInRecently(admin.authTime)
              ? "Approving updates the Support panel straight away and records who requested and who approved."
              : "Approving asks you to sign in with Google again first. Then come back here and approve."}
          </p>
          <div className="actions">
            <button className="btn danger" formAction={rejectPaymentRequest}>Reject</button>
            <button className="btn gold">Approve and publish</button>
          </div>
        </form>
      )}
    </>
  );
}
