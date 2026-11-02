import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { actionLabel } from "../../../../lib/admin/activity.mjs";
import { isPublic, statusLabel, supporterNumber } from "../../../../lib/supporters.mjs";
import { brandHistory } from "../../../../lib/eventBrandsStore";
import { replyLabel } from "../../../../lib/eventBrands.mjs";
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
  const [events, history, around] = await Promise.all([
    brandHistory(row.id),
    sql("SELECT at, actor_email, action, details FROM activity_log WHERE details->>'supporterId' = $1 ORDER BY at DESC LIMIT 30", [id]),
    // This brand and its neighbours in the directory's A–Z order, for Previous / Next.
    sql(
      `WITH o AS (SELECT id, name, row_number() OVER (ORDER BY lower(name), id)::int AS n, count(*) OVER ()::int AS total FROM supporters),
            me AS (SELECT n FROM o WHERE id = $1)
       SELECT o.id, o.name, o.n, o.total, o.n - me.n AS step FROM o, me WHERE o.n BETWEEN me.n - 1 AND me.n + 1 ORDER BY o.n`,
      [id],
    ),
  ]);
  const prev = around.find((r) => r.step === -1);
  const next = around.find((r) => r.step === 1);
  const here = around.find((r) => r.step === 0);
  const joined = events.filter((e) => e.reply === "yes" && e.status === "published").length;
  const shown = isPublic(row, { joined });
  return (
    <>
      <nav className="record-nav small" aria-label="Brands">
        <a href={`${base}/supporters`}>← Brands & Partners</a>
        <span className="record-nav-step">
          {prev ? <a className="btn ghost small" href={`${base}/supporters/${prev.id}`} title={prev.name}>‹ Previous</a> : <span className="btn ghost small" aria-disabled="true">‹ Previous</span>}
          {here && <span className="muted">{here.n} of {here.total}</span>}
          {next ? <a className="btn ghost small" href={`${base}/supporters/${next.id}`} title={next.name}>Next ›</a> : <span className="btn ghost small" aria-disabled="true">Next ›</span>}
        </span>
      </nav>
      <PageHead title={row.name} lead={[`Usually ${row.kind}`, row.category_label, supporterNumber(row), joined ? `Joined ${joined} event${joined === 1 ? "" : "s"}` : "", shown ? "On the website" : "Not on the website"].filter(Boolean).join(" · ")}>
        {shown && <a className="btn ghost" href={`${HOME_URL}/?supporter=${row.slug}#partners`} target="_blank" rel="noreferrer">View on website ↗</a>}
      </PageHead>
      <Flash params={query} />
      <div className="grid-2 supporter-grid">
        <SupporterForm row={row} canEdit={can(admin, "supporters:edit")} joined={joined} />
        <div className="form" style={{ gap: 20 }}>
          <section className="card">
            <h2>Events</h2>
            <p className="small muted">Every event they were invited to, from each event&apos;s Brand tracker.</p>
            {events.length ? (
              <ul className="plain-list">
                {events.map((e) => (
                  <li key={e.event_id}>
                    <a href={`${base}/events/${e.event_id}/brands`}>{e.title}</a> <span className="small muted">· {e.date ? isoDate(e.date) : "no date"}{e.status === "draft" ? " · draft" : ""} · as {e.role}</span>{" "}
                    <span className={`chip ${e.reply === "yes" ? "good" : e.reply === "no" ? "alert" : ""}`.trim()}>{replyLabel(e.reply)}</span>
                    {(e.cash_amount != null || e.in_kind_value != null) && <span className="small muted"> · {[e.cash_amount != null && `₱${Number(e.cash_amount).toLocaleString("en-PH")} cash`, e.in_kind_value != null && `₱${Number(e.in_kind_value).toLocaleString("en-PH")} in kind`].filter(Boolean).join(", ")}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small">Not invited to any event yet. Open an event, then <strong>Brands &amp; partnerships</strong> → + Invite brands.</p>
            )}
          </section>
          {can(admin, "supporters:edit") && (
            <section className="card danger-zone">
              <h2>Delete this record</h2>
              <p className="small muted">For test or mistaken records. A brand on any event&apos;s Brand tracker can&apos;t be deleted until it&apos;s taken off.</p>
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
