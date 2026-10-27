import { sql } from "../../../lib/db";
import { pageAdmin } from "../../../lib/admin/guard";
import { actionLabel } from "../../../lib/admin/activity.mjs";
import { PAGES, ROLES, ROLE_LABELS, pageLevel, pagesForRoles, parseEmailList } from "../../../lib/admin/roles.mjs";
import { startPreview } from "../../previewActions";
import { inviteAdmin, removeAdmin, saveAdminPages, updateAdmin } from "../../actions";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";
import ConfirmButton from "../ConfirmButton";

const ROLE_HELP = {
  owner: "Everything, including admins and approving payment changes",
  events: "Events, registrations and People",
  treasurer: "Requests payment changes, tracks fees",
  content: "Site content (phase 2)",
  checkin: "Event-day check-in only",
};

function RolePicker({ selected = [], idPrefix }) {
  return (
    <fieldset className="plain">
      <legend>Roles</legend>
      {ROLES.map((role) => (
        <label className="check" key={role} htmlFor={`${idPrefix}-${role}`}>
          <input id={`${idPrefix}-${role}`} type="checkbox" name="roles" value={role} defaultChecked={selected.includes(role)} />
          <span><strong>{ROLE_LABELS[role]}</strong> <span className="small muted">· {ROLE_HELP[role]}</span></span>
        </label>
      ))}
    </fieldset>
  );
}

/** — / View / Edit for one page ("" is sent for hidden and ignored). */
function AccessSelect({ page, level = "", label, form, id }) {
  return (
    <select form={form} id={id} name="pages" defaultValue={level ? (level === "view" ? `${page.key}:view` : page.key) : ""} aria-label={label} className={`access ${level}`}>
      <option value="">—</option>
      <option value={`${page.key}:view`}>View</option>
      {page.edit.length > 0 && <option value={page.key}>Edit</option>}
    </select>
  );
}

/**
 * One row per person, one tick box per sidebar page (owner, 2026-10-27).
 * Ticked pages are the only ones in their sidebar and the only ones they can
 * open. Owners always have every page.
 */
function PageAccess({ admins }) {
  const people = admins.filter((a) => !a.roles.includes("owner"));
  return (
    <section className="card">
      <h2>Page access</h2>
      <p className="small muted">For each person, set every page to <strong>—</strong> (hidden), <strong>View</strong> (can open and read only) or <strong>Edit</strong> (can also save, send and delete), then press Save on their row. <strong>Preview</strong> shows you the admin exactly as they will see it. Only pages set to View or Edit show in their sidebar; every other page is blocked for them. Owners always see and edit every page.</p>
      {people.length === 0 ? (
        <p className="empty">No one to set yet. Invite an admin above and set their pages there.</p>
      ) : (
        <div className="table-wrap">
          <table className="page-access">
            <thead>
              <tr>
                <th>Person</th>
                {PAGES.map((p) => <th key={p.key} scope="col"><span>{p.label}</span></th>)}
                <th><span className="visually-hidden">Save</span></th>
              </tr>
            </thead>
            <tbody>
              {people.map((a) => {
                const formId = `pages-${a.email}`;
                const ticked = Array.isArray(a.pages) ? a.pages : pagesForRoles(a.roles);
                return (
                  <tr key={a.email}>
                    <th scope="row" className="strong">
                      {a.name || a.email}
                      {!Array.isArray(a.pages) && <span className="small muted"><br />From their roles — not saved yet</span>}
                    </th>
                    {PAGES.map((p) => (
                      <td key={p.key} className="tick">
                        <AccessSelect form={formId} page={p} level={pageLevel(ticked, p.key)} label={`${p.label} for ${a.email}`} />
                      </td>
                    ))}
                    <td>
                      <form action={startPreview}>
                        <input type="hidden" name="email" value={a.email} />
                        <ConfirmButton
                          className="linkish small"
                          title={`Preview the admin as ${a.email}?`}
                          items={["You'll see exactly their menu and pages", "Changes are switched off until you exit the preview"]}
                          yes="Yes, preview"
                          tone="ink"
                        >Preview</ConfirmButton>
                      </form>
                      <form id={formId} action={saveAdminPages}>
                        <input type="hidden" name="email" value={a.email} />
                        <ConfirmButton
                          className="btn small"
                          title={`Save page access for ${a.email}?`}
                          items={["Only pages set to View or Edit show in their sidebar", "Other pages are blocked, even by direct link", "Takes effect on their next page or action"]}
                          yes="Yes, save pages"
                          tone="ink"
                        >Save</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function AdminsPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("log:view");
  if (!allowed) return <NotAllowed />;
  const envOwners = parseEmailList(process.env.ADMIN_OWNER_EMAILS);
  const [admins, log] = await Promise.all([
    sql("SELECT email, name, roles, pages, active, last_seen_at, invited_by FROM admins WHERE active ORDER BY ('owner' = ANY(roles)) DESC, email"),
    sql("SELECT at, actor_email, action, target FROM activity_log ORDER BY at DESC LIMIT 100"),
  ]);
  const owners = admins.filter((a) => a.roles.includes("owner")).length;

  return (
    <>
      <PageHead title="Admins & activity log" lead="Who can sign in and what they can change. Keep at least two Owners so payment changes can always be approved." />
      <Flash params={params} />
      {owners < 2 && <p className="banner alert">Only {owners} Owner. A payment change needs a different Owner to approve it, so invite a second one.</p>}

      <section className="card">
        <h2>Invite an admin</h2>
        <p className="small muted">While HOR&apos;s Google sign-in app is in Testing, also add their email under Google Cloud → Google Auth Platform → Audience → Test users, or Google will stop them before they reach this site.</p>
        <form action={inviteAdmin} className="form">
          <label className="field"><span>Their Google email <small>The account they&apos;ll sign in with</small></span><input type="email" name="email" required /></label>
          <fieldset className="plain">
            <legend>Page access <small className="muted">— hidden · View = read only · Edit = read and write</small></legend>
            <div className="page-ticks">
              {PAGES.map((p) => (
                <label className="field" key={p.key} htmlFor={`invite-page-${p.key}`}>
                  <span>{p.label}</span>
                  <AccessSelect id={`invite-page-${p.key}`} page={p} label={p.label} />
                </label>
              ))}
            </div>
          </fieldset>
          <details>
            <summary className="linkish small">Or give a role instead (Owner = every page)</summary>
            <RolePicker idPrefix="invite" />
          </details>
          <div>
            <ConfirmButton
              title="Invite this admin?"
              echo={[{ name: "email", label: "Google email" }]}
              items={["They can sign in once their Google account is also allowed in Google Cloud", "Only pages set to View or Edit show in their sidebar"]}
              yes="Yes, invite admin"
            >Invite</ConfirmButton>
          </div>
        </form>
      </section>

      <PageAccess admins={admins} />

      <h2>Admins</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Admin</th><th>Roles</th><th>Last signed in</th><th><span className="visually-hidden">Edit</span></th></tr></thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email}>
                <td className="strong">{a.name ? `${a.name} · ` : ""}{a.email}{envOwners.includes(a.email) && <span className="small muted"><br />Owner set in Vercel</span>}</td>
                <td><div className="actions">{a.roles.map((r) => <span key={r} className={`chip ${r === "owner" ? "dark" : ""}`}>{ROLE_LABELS[r] || r}</span>)}</div>{Array.isArray(a.pages) && !a.roles.includes("owner") && <span className="small muted">Pages: {PAGES.filter((p) => a.pages.includes(p.key)).map((p) => p.label).join(", ")}</span>}</td>
                <td>{formatWhen(a.last_seen_at)}</td>
                <td>
                  <details>
                    <summary className="linkish">Edit</summary>
                    <form action={updateAdmin} className="form" style={{ marginTop: 12, minWidth: 320 }}>
                      <input type="hidden" name="email" value={a.email} />
                      <RolePicker selected={a.roles} idPrefix={`edit-${a.email}`} />
                      <div className="actions">
                        <ConfirmButton
                          className="btn small"
                          title={`Save roles for ${a.email}?`}
                          items={["Their permissions change on their next page or action", "Roles are still checked fresh from the database"]}
                          yes="Yes, save roles"
                          tone="ink"
                        >Save roles</ConfirmButton>
                        <ConfirmButton
                          className="btn small danger"
                          formAction={removeAdmin}
                          title={`Remove ${a.email}'s admin access?`}
                          items={["They can no longer sign in as an active admin", "Their earlier activity-log entries stay"]}
                          yes="Yes, remove access"
                          tone="danger"
                        >Remove access</ConfirmButton>
                      </div>
                    </form>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Activity log</h2>
      <p className="muted">Every change, by whom and when. Nobody can edit or delete it. Latest 100 shown.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>About</th></tr></thead>
          <tbody>
            {log.length === 0 && <tr><td colSpan={4} className="empty">Nothing yet.</td></tr>}
            {log.map((row, i) => (
              <tr key={i}><td>{formatWhen(row.at)}</td><td>{row.actor_email}</td><td>{actionLabel(row.action)}</td><td>{row.target || "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
