import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { CUSTOM_KINDS, EDITABLE_TEMPLATES } from "../../../lib/emailTemplates.mjs";
import { listCustomTemplates } from "../../../lib/emailSettings";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";

/** The emails HOR can reword, and the ones HOR has written itself. */
export default async function EmailsPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("people:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  let saved = [];
  let uses = [];
  try {
    saved = await sql("SELECT key, updated_by, updated_at FROM email_templates");
    uses = await sql("SELECT email_template_id AS id, count(*)::int AS n FROM events WHERE email_template_id IS NOT NULL GROUP BY 1");
  } catch {}
  const custom = await listCustomTemplates();
  return (
    <>
      <PageHead title="Email templates" lead="Put HOR's emails in its own words. Use {{first_name}} and the other variables to greet each person by name. The logo band, sign-off and footer stay the same on every email." />
      <Flash params={params} />

      <h2 style={{ margin: "8px 0 12px" }}>Sent automatically</h2>
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

      <h2 style={{ margin: "36px 0 6px" }}>Your templates</h2>
      <p className="small muted">Write as many as you need. <strong>Acceptance</strong> templates are sent from a person's profile (or picked when making a member Active). <strong>Event confirmation</strong> templates are picked per event and go to everyone who RSVPs.</p>
      <div className="actions" style={{ margin: "12px 0 16px" }}>
        {Object.entries(CUSTOM_KINDS).map(([kind, k]) => (
          <a key={kind} className="btn ghost" href={`${base}/emails/new?kind=${kind}`}>+ New {k.title.toLowerCase()} template</a>
        ))}
      </div>
      {custom.length ? (
        <ul className="supporter-cards">
          {custom.map((t) => {
            const n = uses.find((u) => u.id === t.id)?.n || 0;
            return (
              <li key={t.id}>
                <a className="card supporter-card" href={`${base}/emails/custom/${t.id}`}>
                  <strong>{t.name}</strong>
                  <span className="tag-badge" style={{ justifySelf: "start" }}>{CUSTOM_KINDS[t.kind]?.title}</span>
                  <span className="small">{t.subject}</span>
                  <span className="supporter-card-site">{t.kind === "event" ? `${n ? `Used by ${n} event${n === 1 ? "" : "s"}` : "Not used by an event yet"} · ` : ""}Changed {formatWhen(t.updated_at)} by {t.updated_by}</span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="banner note small">No templates of your own yet.</p>
      )}
    </>
  );
}
