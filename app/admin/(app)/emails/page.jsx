import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { EDITABLE_TEMPLATES } from "../../../lib/emailTemplates.mjs";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";

/** The emails HOR can reword, and whether each uses its own wording yet. */
export default async function EmailsPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("people:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  let saved = [];
  try {
    saved = await sql("SELECT key, updated_by, updated_at FROM email_templates");
  } catch {}
  return (
    <>
      <PageHead title="Email templates" lead="Put the welcome emails in HOR's own words. Use {{first_name}} and the other variables to greet each person by name. The logo band, sign-off and footer stay the same on every email." />
      <Flash params={params} />
      <ul className="supporter-cards">
        {Object.entries(EDITABLE_TEMPLATES).map(([key, t]) => {
          const row = saved.find((r) => r.key === key);
          return (
            <li key={key}>
              <a className="card supporter-card" href={`${base}/emails/${key}`}>
                <strong>{t.title}</strong>
                <span className="small">{t.when}</span>
                <span className={`supporter-card-site${row ? " is-on" : ""}`}>{row ? `● Your wording · ${formatWhen(row.updated_at)} by ${row.updated_by}` : "○ Original wording"}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="banner note small">Other emails (RSVP pass, volunteer, partner and sponsor notes) use fixed wording for now.</p>
    </>
  );
}
