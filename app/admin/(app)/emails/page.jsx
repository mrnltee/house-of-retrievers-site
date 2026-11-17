import FrameEditor from "./FrameEditor";
import { can } from "../../../lib/admin/roles.mjs";
import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { CUSTOM_KINDS, EDITABLE_TEMPLATES } from "../../../lib/emailTemplates.mjs";
import { listCustomTemplates, loadEmailFrame } from "../../../lib/emailSettings";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";
import HowTo from "../HowTo";
import { LETTER_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import Icon from "../../../components/Icon";
import EditDialog from "../EditDialog";

/** The emails HOR can reword, and the ones HOR has written itself. */
export default async function EmailsPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("emails:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  let saved = [];
  let uses = [];
  try {
    saved = await sql("SELECT key, updated_by, updated_at FROM email_templates");
    uses = await sql("SELECT email_template_id AS id, count(*)::int AS n FROM events WHERE email_template_id IS NOT NULL GROUP BY 1");
  } catch {}
  const custom = await listCustomTemplates();
  const canEdit = can(admin, "emails:edit");
  // The automatic emails grouped by what sends them (design review, 17 Nov 2026).
  const AUTO = [
    ["Replies to the Join form", "Sent straight away, the first time someone joins.", ["member-registered", "received-volunteer", "received-partner", "received-sponsor"]],
    ["Welcomes", "When an admin makes a member or volunteer Active.", ["member-welcome", "volunteer-welcome"]],
    ["Events", "The pass, and the reminder you send before the day.", ["rsvp-confirmed", "event-reminder"]],
  ];
  const grouped = new Set(AUTO.flatMap(([, , keys]) => keys));
  const others = Object.keys(EDITABLE_TEMPLATES).filter((k) => !grouped.has(k));
  if (others.length) AUTO.push(["Other", "", others]);
  const autoCard = (key) => {
    const t = EDITABLE_TEMPLATES[key];
    if (!t) return null;
    const row = saved.find((r) => r.key === key);
    return (
      <li key={key}>
        <a className="card supporter-card" href={`${base}/emails/${key}`}>
          <strong>{t.title}</strong>
          <span className="small">{t.when}</span>
          <span className={`supporter-card-site${row ? " is-on" : ""}`}>{row ? `Your wording · edited ${formatWhen(row.updated_at)}` : "HoR's original wording"}</span>
        </a>
      </li>
    );
  };
  return (
    <>
      <PageHead title="Email templates" lead="The wording of HoR's emails: the ones sent automatically, and templates you write yourself. Each greets the person by name.">
        <HowTo guide="new-template" guides={LETTER_GUIDES} className="btn ghost" />
        {canEdit && (
          <EditDialog label="+ New template" buttonClass="btn gold" title="New template" lead="Pick what it's for. It opens in the editor with a starting wording.">
            <ul className="template-kinds">
              {Object.entries(CUSTOM_KINDS).map(([kind, k]) => (
                <li key={kind}><a href={`${base}/emails/new?kind=${kind}`}><strong>{k.title}</strong><span className="small muted">{k.when}</span></a></li>
              ))}
            </ul>
          </EditDialog>
        )}
      </PageHead>
      <Flash params={params} />

      <section aria-labelledby="auto-head">
        <h2 id="auto-head" style={{ margin: "0 0 4px" }}>Sent automatically</h2>
        <p className="small muted" style={{ margin: "0 0 12px" }}>Open one to change its wording. The event box, QR and buttons are added for you.</p>
        {AUTO.map(([title, note, keys]) => (
          <div key={title} className="email-group">
            <h3 className="email-group-head">{title} {note && <span className="small muted">· {note}</span>}</h3>
            <ul className="supporter-cards">{keys.map(autoCard)}</ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="own-head" style={{ marginTop: 28 }}>
        <h2 id="own-head" style={{ margin: "0 0 4px" }}>Your templates</h2>
        <p className="small muted" style={{ margin: "0 0 12px" }}>Picked when you need them: on a person&apos;s profile, in an event&apos;s confirmation, when emailing participants, or under “Write my own email” when sending a letter.</p>
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
                    <span className="supporter-card-site">{t.kind === "event" ? `${n ? `Used by ${n} event${n === 1 ? "" : "s"}` : "Not used by an event yet"} · ` : ""}Edited {formatWhen(t.updated_at)}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="banner note small">No templates of your own yet.{canEdit && " Press + New template at the top to write one."}</p>
        )}
      </section>

      <section aria-labelledby="look-head" style={{ marginTop: 28 }}>
        <h2 id="look-head" style={{ margin: "0 0 12px" }}>How emails look</h2>
        <a className="card email-look-link" href={`${base}/emails/designs`}>
          <span><strong>Brand email designs</strong><br /><span className="small muted">Designed emails for brand outreach: invites with or without the PDF letter, follow-ups and thank-yous, with HoR&apos;s shared header and footer.</span></span>
          <Icon name="arrow" />
        </a>
        <details className="card email-frame-fold">
          <summary><strong>Sign-off and footer</strong> <span className="small muted">· how every email ends</span></summary>
          <FrameEditor saved={await loadEmailFrame({ fresh: true })} canEdit={canEdit} />
        </details>
      </section>
    </>
  );
}
