import { sql } from "../../../lib/db";
import { pageAdmin } from "../../../lib/admin/guard";
import { actionLabel } from "../../../lib/admin/activity.mjs";
import { ROLES, ROLE_LABELS, parseEmailList } from "../../../lib/admin/roles.mjs";
import { inviteAdmin, removeAdmin, updateAdmin } from "../../actions";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";

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

export default async function AdminsPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("log:view");
  if (!allowed) return <NotAllowed />;
  const envOwners = parseEmailList(process.env.ADMIN_OWNER_EMAILS);
  const [admins, log] = await Promise.all([
    sql("SELECT email, name, roles, active, last_seen_at, invited_by FROM admins WHERE active ORDER BY ('owner' = ANY(roles)) DESC, email"),
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
          <div><button className="btn gold">Invite</button></div>
        </form>
      </section>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Admin</th><th>Roles</th><th>Last signed in</th><th><span className="visually-hidden">Edit</span></th></tr></thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email}>
                <td className="strong">{a.name ? `${a.name} · ` : ""}{a.email}{envOwners.includes(a.email) && <span className="small muted"><br />Owner set in Vercel</span>}</td>
                <td><div className="actions">{a.roles.map((r) => <span key={r} className={`chip ${r === "owner" ? "dark" : ""}`}>{ROLE_LABELS[r] || r}</span>)}</div></td>
                <td>{formatWhen(a.last_seen_at)}</td>
                <td>
                  <details>
                    <summary className="linkish">Edit</summary>
                    <form action={updateAdmin} className="form" style={{ marginTop: 12, minWidth: 320 }}>
                      <input type="hidden" name="email" value={a.email} />
                      <RolePicker selected={a.roles} idPrefix={`edit-${a.email}`} />
                      <div className="actions">
                        <button className="btn small">Save roles</button>
                        <button className="btn small danger" formAction={removeAdmin}>Remove access</button>
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
