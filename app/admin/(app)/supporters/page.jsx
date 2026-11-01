import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { isPublic, supporterNumber } from "../../../lib/supporters.mjs";
import { joinedCounts } from "../../../lib/eventBrandsStore";
import { Flash, NotAllowed, PageHead } from "../ui";
import TickedSubmit from "../TickedSubmit";

const cleanParam = (value, max = 80) => String(value || "").trim().slice(0, max);

/** Sponsors & partners: the brand directory (owner, 2026-11-01), cards or table; invites and replies live on each event's Brand tracker. */
export default async function SupportersPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("supporters:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const kind = ["Sponsor", "Partner"].includes(params?.kind) ? params.kind : "";
  const status = ""; // A directory now: commitment is per event (Brand tracker), so no status filter.
  const label = cleanParam(params?.label, 60);
  const q = cleanParam(params?.q);
  const view = params?.view === "list" ? "list" : "cards";
  const [rows, counts, joined, waiting, labels] = await Promise.all([
    sql(
      `SELECT * FROM supporters
        WHERE ($1 = '' OR kind = $1)
          AND ($2 = '' OR status = $2)
          AND ($3 = '' OR category_label = $3)
          AND ($4 = '' OR name ILIKE '%' || $4 || '%' OR coalesce(code, '') ILIKE '%' || $4 || '%' OR coalesce(category_label, '') ILIKE '%' || $4 || '%')
        ORDER BY lower(name)`,
      [kind, status, label, q],
    ),
    sql("SELECT kind, count(*)::int AS n FROM supporters GROUP BY kind"),
    joinedCounts(),
    sql(
      `SELECT p.id, p.name, p.organization, p.kind FROM people p
        WHERE p.kind IN ('Sponsor','Partner')
          AND NOT EXISTS (SELECT 1 FROM supporters s WHERE s.person_id = p.id OR lower(s.name) = lower(coalesce(nullif(p.organization, ''), p.name)))
        ORDER BY p.created_at DESC LIMIT 20`,
    ),
    sql("SELECT DISTINCT category_label FROM supporters WHERE category_label IS NOT NULL ORDER BY category_label"),
  ]);
  const count = (key) => counts.find((item) => item.kind === key)?.n || 0;
  const canEdit = can(admin, "supporters:edit");
  // Published events each brand said Yes to, from the Brand trackers.
  const joinedOf = (row) => joined[row.id] || 0;
  const current = { ...(kind && { kind }), ...(status && { status }), ...(label && { label }), ...(q && { q }), ...(view === "list" && { view }) };
  const href = (changes = {}) => {
    const next = { ...current, ...changes };
    Object.keys(next).forEach((key) => (next[key] == null || next[key] === "") && delete next[key]);
    const query = new URLSearchParams(next).toString();
    return `${base}/supporters${query ? `?${query}` : ""}`;
  };
  const filtered = Boolean(kind || status || label || q);
  // "Send a letter to everyone shown" carries the same filters to the send page.
  const allShown = (() => {
    const query = new URLSearchParams({ all: "1", ...(kind && { kind }), ...(status && { status }), ...(label && { label }), ...(q && { q }) });
    return `${base}/letters/send?${query.toString()}`;
  })();

  return (
    <>
      <PageHead title="Sponsors & partners" lead="Who backs HOR and how. Add a clear relationship label, then use cards for a quick scan or the list when the records grow.">
        {canEdit && <a className="btn ghost" href={`${base}/supporters/import`}>Import from Excel</a>}
        {canEdit && <a className="btn gold" href={`${base}/supporters/new`}>+ Add sponsor or partner</a>}
      </PageHead>
      <Flash params={params} />

      <div className="supporter-toolbar">
        <nav className="tabs" aria-label="Kind">
          <a href={href({ kind: null })} aria-current={!kind ? "page" : undefined}>All · {count("Sponsor") + count("Partner")}</a>
          <a href={href({ kind: "Sponsor" })} aria-current={kind === "Sponsor" ? "page" : undefined}>Sponsors · {count("Sponsor")}</a>
          <a href={href({ kind: "Partner" })} aria-current={kind === "Partner" ? "page" : undefined}>Partners · {count("Partner")}</a>
        </nav>
        <nav className="tabs small-tabs" aria-label="View">
          <a href={href({ view: null })} aria-current={view === "cards" ? "page" : undefined}>Cards</a>
          <a href={href({ view: "list" })} aria-current={view === "list" ? "page" : undefined}>List</a>
        </nav>
      </div>


      <form method="get" action={`${base}/supporters`} className="card supporter-filters" role="search">
        {kind && <input type="hidden" name="kind" value={kind} />}
        {status && <input type="hidden" name="status" value={status} />}
        {view === "list" && <input type="hidden" name="view" value="list" />}
        <label className="field">
          <span>Find a record</span>
          <input type="search" name="q" defaultValue={q} maxLength={80} placeholder="Name, ID or relationship" />
        </label>
        <label className="field">
          <span>Relationship label</span>
          <select name="label" defaultValue={label}>
            <option value="">All labels</option>
            {labels.map((item) => <option key={item.category_label} value={item.category_label}>{item.category_label}</option>)}
          </select>
        </label>
        <div className="actions supporter-filter-actions">
          <button type="submit" className="btn dark" data-confirm="not-needed-read-only">Filter</button>
          {filtered && <a className="btn ghost" href={href({ kind: null, status: null, label: null, q: null })}>Clear</a>}
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="card muted">{filtered ? "No sponsors or partners match these filters." : "No sponsors or partners yet. Add one, or open a Sponsor or Partner in People and choose “Make a sponsor record”."}</p>
      ) : view === "list" ? (
        <form method="get" action={`${base}/letters/send`}>
        {canEdit && (
          <div className="actions supporter-letter-bar">
            <TickedSubmit />
            <a className="btn ghost" href={allShown}>Send a letter to all {rows.length} shown</a>
            <span className="small muted">Pick the letter and check it before anything is sent.</span>
          </div>
        )}
        <div className="table-wrap supporter-list-wrap">
          <table>
            <thead><tr>{canEdit && <th><span className="sr-only">Pick</span></th>}<th>Organization</th><th>ID</th><th>Usually</th><th>Joined</th><th>Website</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                return (
                  <tr key={row.id}>
                    {canEdit && <td><input type="checkbox" name="to" value={`supporter:${row.id}`} aria-label={`Pick ${row.name}`} /></td>}
                    <td className="strong"><span className="supporter-list-name"><span className="supporter-card-logo">{row.logo ? <img src={row.logo} alt="" /> : row.name.slice(0, 2).toUpperCase()}</span><a href={`${base}/supporters/${row.id}`}>{row.name}</a></span></td>
                    <td className="supporter-id-cell">{supporterNumber(row) || (row.code ? `HOR-${row.code}-YY-NNNN` : "—")}</td>
                    <td><span className="chips"><span className="chip">{row.kind}</span>{row.category_label && <span className="chip">{row.category_label}</span>}</span></td>
                    <td>{joinedOf(row) ? `${joinedOf(row)} event${joinedOf(row) === 1 ? "" : "s"}` : "—"}</td>
                    <td>{row.website ? <a href={row.website} target="_blank" rel="noreferrer">Open ↗</a> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </form>
      ) : (
        <>
        {canEdit && (
          <div className="actions supporter-letter-bar">
            <a className="btn ghost" href={allShown}>✉ Send a letter to all {rows.length} shown</a>
            <span className="small muted">To pick some, switch to <a href={href({ view: "list" })}>List</a> and tick them.</span>
          </div>
        )}
        <ul className="supporter-cards">
          {rows.map((row) => {
            return (
              <li key={row.id}>
                <a className="card supporter-card" href={`${base}/supporters/${row.id}`}>
                  <span className="supporter-card-top">
                    <span className="supporter-card-logo">{row.logo ? <img src={row.logo} alt="" /> : row.name.slice(0, 2).toUpperCase()}</span>
                    <span>
                      <strong>{row.name}</strong>
                      {supporterNumber(row) && <span className="small muted" style={{ display: "block", marginBottom: 6 }}>{supporterNumber(row)}</span>}
                      <span className="chips">
                        <span className="chip">{row.kind}</span>
                        {row.category_label && <span className="chip">{row.category_label}</span>}
                      </span>
                    </span>
                  </span>
                  <span className="small">{row.contact_name || row.contact_email ? [row.contact_name, row.contact_email].filter(Boolean).join(" · ") : "No contact yet"}</span>
                  <span className="small muted">{joinedOf(row) ? `Joined ${joinedOf(row)} event${joinedOf(row) === 1 ? "" : "s"}` : "Hasn't joined an event yet"}</span>
                  <span className={`supporter-card-site${isPublic(row, { joined: joinedOf(row) }) ? " is-on" : ""}`}>{isPublic(row, { joined: joinedOf(row) }) ? "● On the website" : "○ Not on the website"}</span>
                </a>
              </li>
            );
          })}
        </ul>
        </>
      )}

      {canEdit && waiting.length > 0 && (
        <section className="card">
          <h2>From the Join form</h2>
          <p className="small muted">Sponsors and partners who used the Join form and don't have a record yet.</p>
          <ul className="plain-list">
            {waiting.map((person) => (
              <li key={person.id}><a href={`${base}/people/${person.id}`}>{person.organization || person.name}</a> <span className="small muted">· {person.kind}{person.organization ? ` · ${person.name}` : ""}</span></li>
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
