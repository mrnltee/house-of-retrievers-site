import { sql } from "../../../lib/db";
import { pageAdmin } from "../../../lib/admin/guard";
import { actionLabel } from "../../../lib/admin/activity.mjs";
import { PAGES, ROLES, ROLE_LABELS, pagesForRoles, parseEmailList } from "../../../lib/admin/roles.mjs";
import { inviteAdmin, removeAdmin, resetAdminPages, saveAdminPages, updateAdmin } from "../../actions";
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

/** Tick the sidebar pages this person can use; starts from what their roles allow. */
function PagePicker({ admin }) {
  const custom = Array.isArray(admin.pages);
  const ticked = custom ? admin.pages : pagesForRoles(admin.roles);
  const id = `pages-${admin.email}`;
  return (
    <form action={saveAdminPages} className="form" style={{ marginTop: 16 }}>
      <input type="hidden" name="email" value={admin.email} />
      <fieldset className="plain">
        <legend>Page access</legend>
        <p className="small muted" style={{ margin: 0 }}>
          {custom ? "Only the ticked pages show in their sidebar, and they can do everything on them." : "Now following their roles. Saving ticks gives them exactly the ticked pages instead."}
        </p>
        {PAGES.map((page) => (
          <label className="check" key={page.key} htmlFor={`${id}-${page.key}`}>
            <input id={`${id}-${page.key}`} type="checkbox" name="pages" value={page.key} defaultChecked={ticked.includes(page.key)} />
            <span>{page.label} <span className="small muted">· {page.group}</span></span>
          </label>
        ))}
      </fieldset>
      <div className="actions">
        <ConfirmButton
          className="btn small"
          title={`Save page access for ${admin.email}?`}
          items={["Their sidebar shows only the ticked pages", "Other pages are blocked even by direct link", "Takes effect on their next page or action"]}
          yes="Yes, save pages"
          tone="ink"
        >Save pages</ConfirmButton>
        {custom && (
          <ConfirmButton
            className="btn small ghost"
            formAction={resetAdminPages}
            title={`Go back to roles for ${admin.email}?`}
            items={["Their ticks are cleared", "Their roles decide what they see again"]}
            yes="Yes, use roles"
            tone="ink"
          >Use their roles instead</ConfirmButton>
        )}
      </div>
    </form>
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
          <RolePicker idPrefix="invite" />
          <div>
            <ConfirmButton
              title="Invite this admin?"
              echo={[{ name: "email", label: "Google email" }]}
              items={["They can sign in once their Google account is also allowed in Google Cloud", "Their selected roles decide what they can view and change"]}
              yes="Yes, invite admin"
            >Invite</ConfirmButton>
          </div>
        </form>
      </section>

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
                    {!a.roles.includes("owner") && <PagePicker admin={a} />}
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
