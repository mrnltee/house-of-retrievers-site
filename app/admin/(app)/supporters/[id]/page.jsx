import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { actionLabel } from "../../../../lib/admin/activity.mjs";
import { isPublic, statusLabel, supporterNumber, tierLabel } from "../../../../lib/supporters.mjs";
import { HOME_URL } from "../../../../lib/siteSeo.mjs";
import { Flash, NotAllowed, PageHead, formatWhen, isoDate } from "../../ui";
import SupporterForm from "../SupporterForm";
import ConfirmButton from "../../ConfirmButton";
import { deleteSupporter } from "../../../supporterActions";

/** One sponsor or partner: the record, the events they backed, and its history. */
export default async function SupporterPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("supporters:view");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [row] = await sql("SELECT * FROM supporters WHERE id = $1", [id]);
  if (!row) notFound();
  const base = await adminBase();
  const field = row.kind === "Partner" ? "partners" : "sponsors";
  const [events, history] = await Promise.all([
    sql(`SELECT id, title, date, status FROM events WHERE EXISTS (SELECT 1 FROM unnest(${field}) n WHERE lower(n) = lower($1)) ORDER BY date DESC`, [row.name]),
    sql("SELECT at, actor_email, action, details FROM activity_log WHERE details->>'supporterId' = $1 ORDER BY at DESC LIMIT 30", [id]),
  ]);
  const shown = isPublic(row);
  return (
    <>
      <p className="small"><a href={`${base}/supporters`}>← Sponsors & partners</a></p>
      <PageHead title={row.name} lead={[row.kind, row.category_label, supporterNumber(row), row.tier ? `★ ${tierLabel(row.tier)}` : "", statusLabel(row.status), shown ? "On the website" : "Not on the website"].filter(Boolean).join(" · ")}>
        <a className="btn ghost" href={`${base}/letters/send?to=supporter:${row.id}`}>✉ Send a letter</a>
        {shown && <a className="btn ghost" href={`${HOME_URL}/?supporter=${row.slug}#partners`} target="_blank" rel="noreferrer">View on website ↗</a>}
      </PageHead>
      <Flash params={query} />
      <div className="grid-2 supporter-grid">
        <SupporterForm row={row} canEdit={can(admin, "supporters:edit")} />
        <div className="form" style={{ gap: 20 }}>
          <section className="card">
            <h2>Events they backed</h2>
            <p className="small muted">Filled in from each event's {row.kind === "Partner" ? "Partners" : "Sponsors"} field, matched by name.</p>
            {events.length ? (
              <ul className="plain-list">
                {events.map((e) => (
                  <li key={e.id}><a href={`${base}/events/${e.id}`}>{e.title}</a> <span className="small muted">· {isoDate(e.date)}{e.status === "draft" ? " · draft" : ""}</span></li>
                ))}
              </ul>
            ) : (
              <p className="small">None yet. In an event, add “{row.name}” under {row.kind === "Partner" ? "Partners" : "Sponsors"}.</p>
            )}
          </section>
          {can(admin, "supporters:edit") && (
            <section className="card danger-zone">
              <h2>Delete this record</h2>
              <p className="small muted">For test or mistaken records. Events keep the name in their {row.kind === "Partner" ? "Partners" : "Sponsors"} field.</p>
              <form action={deleteSupporter}>
                <input type="hidden" name="id" value={row.id} />
                <ConfirmButton
                  className="btn danger"
                  tone="danger"
                  title={`Delete ${row.name}?`}
                  items={["The record, logo link and contact details are removed for good", "It disappears from the website and the sponsor list", "Events and the activity history keep their mention of the name"]}
                  note="This can't be undone."
                  yes="Yes, delete it"
                >Delete record</ConfirmButton>
              </form>
            </section>
          )}
          {row.person_id && (
            <section className="card"><h2>From the Join form</h2><p className="small"><a href={`${base}/people/${row.person_id}`}>Open their People record →</a></p></section>
          )}
          <section className="card">
            <h2>History</h2>
            {history.length ? (
              <ol className="person-history">
                {history.map((h, i) => (
                  <li key={i}>
                    <span className="small muted">{formatWhen(h.at)}</span>
                    <span>{actionLabel(h.action)}{h.details?.status ? `: ${statusLabel(h.details.status)}` : ""}{h.details?.code ? ` (ID: ${h.details.code})` : ""}{h.details?.label ? ` (label: ${h.details.label})` : ""}{h.details?.website ? ` (website: ${h.details.website})` : ""}{h.details?.amounts ? " (amounts agreed public)" : ""}</span>
                    <span className="small muted">{h.actor_email}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="small muted">Changes are listed here.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
