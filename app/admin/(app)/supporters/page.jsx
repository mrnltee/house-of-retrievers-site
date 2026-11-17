import BatchBar from "./BatchBar";
import BrandSearch from "./BrandSearch";
import SelectAllBrands from "./SelectAllBrands";
import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { gapLine, supporterNumber, brandNameFrom, newBrandHref, websiteGaps } from "../../../lib/supporters.mjs";
import { joinedCounts } from "../../../lib/eventBrandsStore";
import { Flash, NotAllowed, PageHead } from "../ui";
import HowTo from "../HowTo";

const cleanParam = (value, max = 80) => String(value || "").trim().slice(0, max);

/** Brands & Partners: the brand directory (owner, 2026-11-01), cards or table; invites and replies live on each event's Brand tracker. */
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
  // What the live search looks through, per brand.
  const searchOf = (row) => [row.name, row.code, supporterNumber(row), row.category_label, row.kind, row.contact_name, row.contact_email].filter(Boolean).join(" ").toLowerCase();
  // On the website, or what it still needs to be.
  const siteLine = (row) => {
    const gaps = websiteGaps(row, { joined: joinedOf(row) });
    return gaps.length ? <span className="supporter-card-site">Not on the website · needs {gapLine(gaps)}</span> : <span className="supporter-card-site is-on"><span aria-hidden="true">●</span> On the website</span>;
  };

  return (
    <>
      <PageHead title="Brands & Partners" lead="Every brand HOR has worked with or invited. Invites, replies and letters happen on each event's Brand tracker.">
        <HowTo guide="add-brand" className="btn ghost" />
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


      <BrandSearch q={q} label={label} labels={labels.map((l) => l.category_label)} kind={kind} view={view} action={`${base}/supporters`} newHref={canEdit ? `${base}/supporters/new` : ""} />
      {filtered && <p className="small" style={{ margin: "-4px 0 12px" }}><a href={href({ kind: null, status: null, label: null, q: null })}>Clear filters</a></p>}

      {rows.length === 0 ? (
        <div className="card empty-search">
          <p className="muted" style={{ margin: 0 }}>{q ? `No brand called “${q}” in the directory${kind || label ? " with these filters" : ""}.` : filtered ? "No sponsors or partners match these filters." : "No sponsors or partners yet. Add one, or open a Sponsor or Partner in People and choose “Make a sponsor record”."}</p>
          {/* No results for a name: add it, with the name (and the type filter) carried to the form (owner, 2026-11-14). */}
          {canEdit && q && <p style={{ margin: "12px 0 0" }}><a className="btn gold" href={newBrandHref(base, { name: q, kind })}>Add “{brandNameFrom(q)}” as a new brand</a></p>}
        </div>
      ) : view === "list" ? (
        <>
        {canEdit && <BatchBar back={href().replace(base, "")} />}
        <div className="table-wrap supporter-list-wrap">
          <table>
            <thead><tr>{canEdit && <th><SelectAllBrands /></th>}<th>Organization</th><th>Contact</th><th>ID</th><th>Usually</th><th>Events</th><th>On our website</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                return (
                  <tr key={row.id} data-brand={searchOf(row)}>
                    {canEdit && <td><input type="checkbox" form="brand-batch" name="id" value={row.id} data-name={row.name} aria-label={`Select ${row.name}`} /></td>}
                    <td className="strong"><span className="supporter-list-name"><span className="supporter-card-logo">{row.logo ? <img src={row.logo} alt="" /> : row.name.slice(0, 2).toUpperCase()}</span><a href={`${base}/supporters/${row.id}`}>{row.name}</a></span></td>
                    <td className="small">{row.contact_name || <span className="muted">No contact yet</span>}{row.contact_email && <><br /><span className="muted">{row.contact_email}</span></>}</td>
                    <td className="supporter-id-cell">{supporterNumber(row) || <span className="id-pending" title="Numbered at their first Yes on an event">Not yet{row.code ? ` · ${row.code}` : ""}</span>}</td>
                    <td><span className="chips"><span className="chip">{row.kind}</span>{row.category_label && <span className="chip">{row.category_label}</span>}</span></td>
                    <td>{joinedOf(row) ? `${joinedOf(row)} event${joinedOf(row) === 1 ? "" : "s"}` : <span className="muted">None yet</span>}</td>
                    <td className="small">{siteLine(row)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      ) : (
        <>
        <ul className="supporter-cards">
          {rows.map((row) => {
            return (
              <li key={row.id} data-brand={searchOf(row)}>
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
                  {siteLine(row)}
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
        A brand shows on the home page and its events' pages once it said Yes at a published event, is switched on in its record, and has a logo and a blurb; ending the relationship takes it off by itself. Amounts show only once the brand knows they're public. Invite brands and record their replies on each event's Brand tracker.
      </div>
    </>
  );
}
