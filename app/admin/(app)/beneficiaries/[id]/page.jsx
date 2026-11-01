import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { kindLabel, statusLabel } from "../../../../lib/beneficiaries.mjs";
import { letterFor } from "../../../../lib/contacts.mjs";
import { groupLetters } from "../../../../lib/letterStore";
import { removeBeneficiary } from "../../../beneficiaryActions";
import ConfirmButton from "../../ConfirmButton";
import { Flash, NotAllowed, PageHead, formatWhen, isoDate } from "../../ui";
import { actionLabel } from "../../../../lib/admin/activity.mjs";
import { listLetters } from "../../../../lib/letterStore";
import { refreshSends, sendsFor } from "../../../../lib/letterSendsStore";
import { statusHint, statusLabel as sendLabel, statusTone } from "../../../../lib/letterSends.mjs";
import BeneficiaryForm from "../BeneficiaryForm";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

export default async function BeneficiaryPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("beneficiaries:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const [row] = isUuid(id) ? await sql("SELECT * FROM beneficiaries WHERE id=$1 AND deleted_at IS NULL", [id]) : [];
  if (!row) return <p className="card muted">That beneficiary wasn't found. <a href={`${base}/beneficiaries`}>Back to Beneficiaries</a></p>;
  const canEdit = can(admin, "beneficiaries:edit");
  // Everything between HOR and this beneficiary: events that picked them, letters (with delivery status), and admin activity.
  const ref = `beneficiary:${row.id}`;
  await refreshSends([ref]);
  const [events, sends, history, letters] = await Promise.all([
    sql(`SELECT e.id, e.title, e.date, e.status FROM event_beneficiaries eb JOIN events e ON e.id = eb.event_id
          WHERE eb.beneficiary_id = $1 ORDER BY e.date DESC NULLS LAST`, [row.id]),
    sendsFor([ref]),
    sql("SELECT at, actor_email, action, target, details FROM activity_log WHERE details->>'beneficiaryId' = $1 ORDER BY at DESC LIMIT 50", [row.id]),
    listLetters(),
  ]);
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  const mySends = sends[ref] || [];
  return (
    <>
      <p className="small"><a href={`${base}/beneficiaries`}>← Beneficiaries</a></p>
      <PageHead title={row.name} lead={`${kindLabel(row.kind)} · ${statusLabel(row.status)}${row.location ? ` · ${row.location}` : ""}`}>
        {can(admin, "letters:edit") && <a className="btn ghost" href={`${base}/letters/send?letter=${letterFor("beneficiary", await groupLetters())}&to=beneficiary:${row.id}`}>✉ Send a letter</a>}
      </PageHead>
      <Flash params={query} />
      <div className="grid-2 supporter-grid">
      <BeneficiaryForm row={row} canEdit={canEdit} />
      <div className="form" style={{ gap: 20 }}>
        <section className="card">
          <h2>Events</h2>
          <p className="small muted">Charity events that picked them (in the event form, under “This is a charity event”).</p>
          {events.length ? (
            <ul className="plain-list">
              {events.map((e) => <li key={e.id}><a href={`${base}/events/${e.id}`}>{e.title}</a> <span className="small muted">· {e.date ? isoDate(e.date) : "no date"}{e.status !== "published" ? ` · ${e.status}` : ""}</span></li>)}
            </ul>
          ) : <p className="small">Not picked for an event yet.</p>}
        </section>
        <section className="card">
          <h2>Letters</h2>
          {mySends.length ? (
            <ol className="person-history">
              {mySends.map((s, i) => (
                <li key={i}>
                  <span className="small muted">{formatWhen(s.sent_at)}</span>
                  <span><span className={`chip ${statusTone(s.status)}`.trim()} title={statusHint(s.status)}>{sendLabel(s.status)}</span> {letterName(s.letter_key)}{s.detail ? <span className="small send-detail"> · {s.detail}</span> : null}</span>
                  <span className="small muted">to {s.email_to}{s.cc?.length ? ` (cc ${s.cc.join(", ")})` : ""}{s.status !== "sent" ? ` · ${sendLabel(s.status).toLowerCase()} ${formatWhen(s.status_at)}` : ""}</span>
                </li>
              ))}
            </ol>
          ) : <p className="small">{row.last_sent_at ? `${letterName(row.last_letter)} · ${formatWhen(row.last_sent_at)} (before delivery tracking)` : "No letters sent yet."}</p>}
        </section>
        <section className="card">
          <h2>History</h2>
          {history.length ? (
            <ol className="person-history">
              {history.map((h, i) => (
                <li key={i}>
                  <span className="small muted">{formatWhen(h.at)}</span>
                  <span>{actionLabel(h.action)}{h.details?.letterName ? `: ${h.details.letterName}` : ""}{h.action.startsWith("beneficiary.") && h.action.endsWith("event") ? `: ${h.target}` : ""}</span>
                  <span className="small muted">{h.actor_email}</span>
                </li>
              ))}
            </ol>
          ) : <p className="small muted">Changes, letters and event picks are listed here.</p>}
        </section>
      </div>
      </div>
      {canEdit && (
        <form action={removeBeneficiary} className="actions" style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={row.id} />
          <ConfirmButton className="btn ghost" title={`Remove ${row.name}?`} items={["They leave Beneficiaries. Letters already sent stay sent."]} yes="Yes, remove">Remove</ConfirmButton>
        </form>
      )}
    </>
  );
}
