import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { STATUSES, givesLabel, isPublic, statusLabel, tierLabel } from "../../../lib/supporters.mjs";
import { Flash, NotAllowed, PageHead } from "../ui";

const peso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;

/** Sponsors & partners (Figma S1): one card per organisation. */
export default async function SupportersPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("people:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const kind = ["Sponsor", "Partner"].includes(params?.kind) ? params.kind : "";
  const status = STATUSES.some(([k]) => k === params?.status) ? params.status : "";
  const [rows, counts, events, waiting] = await Promise.all([
    sql(
      `SELECT * FROM supporters WHERE ($1 = '' OR kind = $1) AND ($2 = '' OR status = $2)
        ORDER BY array_position(ARRAY['confirmed','talking','inquiry','ended'], status), name`,
      [kind, status],
    ),
    sql("SELECT kind, count(*)::int AS n FROM supporters GROUP BY kind"),
    sql("SELECT title, date, partners, sponsors FROM events WHERE status <> 'draft' AND (cardinality(partners) > 0 OR cardinality(sponsors) > 0) ORDER BY date DESC"),
    sql(
      `SELECT p.id, p.name, p.organization, p.kind FROM people p
        WHERE p.kind IN ('Sponsor','Partner')
          AND NOT EXISTS (SELECT 1 FROM supporters s WHERE s.person_id = p.id OR lower(s.name) = lower(coalesce(nullif(p.organization, ''), p.name)))
        ORDER BY p.created_at DESC LIMIT 20`,
    ),
  ]);
  const count = (k) => counts.find((c) => c.kind === k)?.n || 0;
  const canEdit = can(admin.roles, "people:edit");
  const backed = (row) => {
    const field = row.kind === "Partner" ? "partners" : "sponsors";
    return events.filter((e) => (e[field] || []).some((n) => n.toLowerCase() === row.name.toLowerCase()));
  };
  const link = (extra) => `${base}/supporters?${new URLSearchParams({ ...(kind ? { kind } : {}), ...(status ? { status } : {}), ...extra })}`;

  return (
    <>
      <PageHead title="Sponsors & partners" lead="Who backs HOR and how. Records marked “On the website” appear on the home page with their logo, tier, amounts and the events they backed.">
        {canEdit && <a className="btn gold" href={`${base}/supporters/new`}>+ Add sponsor or partner</a>}
      </PageHead>
      <Flash params={params} />
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <nav className="tabs" aria-label="Kind">
          <a href={`${base}/supporters${status ? `?status=${status}` : ""}`} aria-current={!kind ? "page" : undefined}>All · {count("Sponsor") + count("Partner")}</a>
          <a href={link({ kind: "Sponsor" })} aria-current={kind === "Sponsor" ? "page" : undefined}>Sponsors · {count("Sponsor")}</a>
          <a href={link({ kind: "Partner" })} aria-current={kind === "Partner" ? "page" : undefined}>Partners · {count("Partner")}</a>
        </nav>
        <nav className="tabs small-tabs" aria-label="Status">
          <a href={`${base}/supporters${kind ? `?kind=${kind}` : ""}`} aria-current={!status ? "page" : undefined}>Any status</a>
          {STATUSES.map(([k, l]) => <a key={k} href={`${base}/supporters?${new URLSearchParams({ ...(kind ? { kind } : {}), status: k })}`} aria-current={status === k ? "page" : undefined}>{l}</a>)}
        </nav>
      </div>

      {rows.length === 0 ? (
        <p className="card muted">{kind || status ? "No one matches." : "No sponsors or partners yet. Add one, or open a Sponsor or Partner in People and choose “Make a sponsor record”."}</p>
      ) : (
        <ul className="supporter-cards">
          {rows.map((r) => {
            const ev = backed(r);
            const gave = [r.cash_amount ? `Cash · ${peso(r.cash_amount)}` : "", r.in_kind_value || r.in_kind_note ? `In-kind${r.in_kind_value ? ` · ${peso(r.in_kind_value)}` : ""}${r.in_kind_note ? ` · ${r.in_kind_note}` : ""}` : "", ...(r.gives || []).filter((g) => !["cash", "in-kind"].includes(g)).map(givesLabel)].filter(Boolean).join(" · ");
            return (
              <li key={r.id}>
                <a className="card supporter-card" href={`${base}/supporters/${r.id}`}>
                  <span className="supporter-card-top">
                    <span className="supporter-card-logo">{r.logo ? <img src={r.logo} alt="" /> : r.name.slice(0, 2).toUpperCase()}</span>
                    <span>
                      <strong>{r.name}</strong>
                      <span className="chips">
                        <span className="chip">{r.kind}</span>
                        {r.tier && <span className={`chip tier-${r.tier}`}>★ {tierLabel(r.tier)}</span>}
                        <span className={`chip status-${r.status}`}>{statusLabel(r.status)}</span>
                      </span>
                    </span>
                  </span>
                  <span className="small">{gave || "Nothing recorded yet"}</span>
                  <span className="small muted">{ev.length ? `${ev.length} event${ev.length === 1 ? "" : "s"} · last ${String(ev[0].date).slice(0, 10)}` : "Not linked to an event yet"}</span>
                  <span className={`supporter-card-site${isPublic(r) ? " is-on" : ""}`}>{isPublic(r) ? "● On the website" : "○ Not on the website"}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && waiting.length > 0 && (
        <section className="card">
          <h2>From the Join form</h2>
          <p className="small muted">Sponsors and partners who used the Join form and don't have a record yet.</p>
          <ul className="plain-list">
            {waiting.map((p) => (
              <li key={p.id}><a href={`${base}/people/${p.id}`}>{p.organization || p.name}</a> <span className="small muted">· {p.kind}{p.organization ? ` · ${p.name}` : ""}</span></li>
            ))}
          </ul>
        </section>
      )}

      <div className="banner note small">
        Status goes Inquiry → Talking → Confirmed, or Ended when the support stops (it then leaves the website by itself). A record shows on the home page only when it's Confirmed, switched on, and has a logo and a blurb. Amounts are public once the sponsor has been told.
      </div>
    </>
  );
}
