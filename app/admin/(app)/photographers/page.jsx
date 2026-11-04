import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { listPhotographers } from "../../../lib/photographersStore";
import { Avatar } from "../ImageField";
import { Flash, NotAllowed, PageHead } from "../ui";

/** Photographers (owner, 2026-11-04): who shoots HOR's events, credited under "Photos by" on past events. */
export default async function PhotographersPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("photographers:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const rows = await listPhotographers();
  return (
    <>
      <PageHead title="Photographers" lead="Who takes HOR's event photos. Credit them on an event from that event's page; past events show them under “Photos by”, with their portfolio and socials.">
        {can(admin, "photographers:edit") && <a className="btn gold" href={`${base}/photographers/new`}>+ Add photographer</a>}
      </PageHead>
      <Flash params={params} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Photographer</th><th>Portfolio</th><th>Events credited</th><th>On the website</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="strong"><span className="row-name"><Avatar photo={p.photo} name={p.name} /><a href={`${base}/photographers/${p.id}`}>{p.name}</a></span></td>
                <td className="small">{p.website ? <a href={p.website} target="_blank" rel="noreferrer">{p.website.replace(/^https?:\/\/(www\.)?/, "")}</a> : "—"}</td>
                <td>{p.events}</td>
                <td>{p.show_on_site ? <span className="chip good">Shown</span> : <span className="chip">Hidden</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="muted">No photographers yet. Add the first one.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
