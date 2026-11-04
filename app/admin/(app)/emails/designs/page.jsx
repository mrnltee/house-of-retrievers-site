import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { KINDS } from "../../../../lib/emailDesign.mjs";
import { listDesigns } from "../../../../lib/emailDesignStore";
import { createDesign, deleteDesign } from "../../../emailDesignActions";
import { Flash, NotAllowed, PageHead, formatWhen } from "../../ui";
import ConfirmButton from "../../ConfirmButton";

/** Email designs (owner, 2026-11-04): the library of block-built brand emails, by kind, and HOR's shared header and footer. */
export default async function DesignsPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("emails:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const canEdit = can(admin, "letters:edit");
  const designs = await listDesigns();
  return (
    <>
      <p className="small"><a href={`${base}/emails`}>← Email templates</a></p>
      <PageHead title="Brand email designs" lead="Designed emails for brand outreach: invites with or without the PDF letter, follow-ups and thank-yous. Pick one on the send page. Events can make their own copy.">
        {canEdit && <a className="btn ghost" href={`${base}/emails/designs/house`}>HOR header &amp; footer</a>}
      </PageHead>
      <Flash params={params} />
      {KINDS.map(([kind, label, hint]) => {
        const rows = designs.filter((d) => d.kind === kind);
        return (
          <section key={kind} className="card" style={{ marginBottom: 16 }}>
            <div className="actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div><h2 style={{ margin: 0 }}>{label}</h2><p className="small muted" style={{ margin: "4px 0 0" }}>{hint}</p></div>
              {canEdit && (
                <form action={createDesign}>
                  <input type="hidden" name="kind" value={kind} />
                  <ConfirmButton className="btn ghost small" title={`Make a new “${label}” design?`} items={["It starts from HOR's wording, ready to edit", "Nothing is sent"]} yes="Yes, make it">+ New</ConfirmButton>
                </form>
              )}
            </div>
            {rows.length ? (
              <ul className="plain-list design-list">
                {rows.map((d) => (
                  <li key={d.id}>
                    <a href={`${base}/emails/designs/${d.id}`}><strong>{d.name}</strong></a>
                    <span className="small muted"> · {d.subject || "No subject yet"} · {formatWhen(d.updated_at)}</span>
                    {canEdit && (
                      <span className="design-row-actions">
                        <form action={createDesign}><input type="hidden" name="from" value={d.id} /><ConfirmButton className="btn ghost small" title={`Duplicate “${d.name}”?`} items={["A copy opens in the editor"]} yes="Yes, duplicate">Duplicate</ConfirmButton></form>
                        <form action={deleteDesign}><input type="hidden" name="id" value={d.id} /><ConfirmButton className="btn ghost small" tone="danger" title={`Delete “${d.name}”?`} items={["Event copies made from it stay", "Emails already sent are unchanged"]} note="This can't be undone." yes="Yes, delete">Delete</ConfirmButton></form>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="small muted" style={{ margin: "10px 0 0" }}>None yet.{canEdit && " Press + New to start from HOR's wording."}</p>}
          </section>
        );
      })}
    </>
  );
}
