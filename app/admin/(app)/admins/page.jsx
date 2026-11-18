import { sql } from "../../../lib/db";
import HowTo from "../HowTo";
import { PAGE_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import { pageAdmin } from "../../../lib/admin/guard";
import { ONLINE_MS, signInWith, yahooReady } from "../../../lib/admin/auth";
import { actionLabel } from "../../../lib/admin/activity.mjs";
import { PAGES, ROLES, ROLE_LABELS, pageLevel, pagesForRoles, parseEmailList } from "../../../lib/admin/roles.mjs";
import { startPreview } from "../../previewActions";
import { inviteAdmin, removeAdmin, updateAdmin } from "../../actions";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";
import ConfirmButton from "../ConfirmButton";
import PageAccessTable from "./PageAccessTable";
import EditDialog from "../EditDialog";
import ListSearch from "../ListSearch";
import { displayName } from "../../../lib/admin/profile.mjs";

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
      <p className="small muted">For each person, set every page to <strong>—</strong> (hidden), <strong>View</strong> (can open and read only) or <strong>Edit</strong> (can also save, send and delete), then press <strong>Save all</strong> at the bottom. Changed boxes are outlined in gold until saved. <strong>Preview</strong> shows you the admin exactly as they will see it. Only pages set to View or Edit show in their sidebar; every other page is blocked for them. Owners always see and edit every page.</p>
      {people.length === 0 ? (
        <p className="empty">No one to set yet. Use + Invite an admin at the top and set their pages there.</p>
      ) : (
        <PageAccessTable
          pages={PAGES.map((p) => ({ key: p.key, label: p.label, canEdit: p.edit.length > 0 }))}
          people={people.map((a) => {
            const ticked = Array.isArray(a.pages) ? a.pages : pagesForRoles(a.roles);
            return { email: a.email, name: a.name || "", fromRoles: !Array.isArray(a.pages), levels: Object.fromEntries(PAGES.map((p) => [p.key, pageLevel(ticked, p.key)])) };
          })}
        />
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
    sql("SELECT email, name, first_name, furbaby_name, show_as, roles, pages, active, last_seen_at, last_active_at, invited_by FROM admins WHERE active ORDER BY ('owner' = ANY(roles)) DESC, email"),
    sql(`SELECT l.at, l.actor_email, l.action, l.target, a.name, a.first_name, a.furbaby_name, a.show_as
           FROM activity_log l LEFT JOIN admins a ON lower(a.email) = lower(l.actor_email) ORDER BY l.at DESC LIMIT 100`),
  ]);
  const owners = admins.filter((a) => a.roles.includes("owner")).length;
  const now = Date.now();
  const isOnline = (a) => a.last_active_at && now - new Date(a.last_active_at).getTime() < ONLINE_MS;
  const online = admins.filter(isOnline).length;

  return (
    <>
      <PageHead title="Admins & activity log" lead="Who can sign in, what they can change, and everything that was changed. Keep at least two Owners so payment changes can always be approved."><HowTo guide={PAGE_GUIDES.admins[0]} guides={PAGE_GUIDES.admins} className="btn ghost" />
        <EditDialog label="+ Invite an admin" buttonClass="btn gold" title="Invite an admin" lead="They get the pages you set here, and nothing else.">
        <p className="small muted">
          They sign in with {yahooReady ? <><strong>Sign in with Google</strong> or <strong>Sign in with Yahoo</strong></> : <strong>Sign in with Google</strong>}, using exactly the email you type here{yahooReady ? ": Google for a Gmail or Google account, Yahoo for a Yahoo account (some Yahoo accounts use another address, such as a Gmail one)" : ""}. Another email, such as Outlook, works with Google once they make a free Google account with it (accounts.google.com/signup → Use your existing email).
        </p>
        <p className="small muted"><strong>Signing in with Google?</strong> While HOR&apos;s Google sign-in app is in Testing, also add their email under Google Cloud → Google Auth Platform → Audience → Test users, or Google will stop them before they reach this site.{yahooReady ? " Yahoo needs no extra step." : ""}</p>
        <form action={inviteAdmin} className="form">
          <label className="field"><span>Their email <small>The {signInWith} account they&apos;ll sign in with</small></span><input type="email" name="email" required autoComplete="off" spellCheck={false} /></label>
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
              echo={[{ name: "email", label: "Email" }]}
              items={[`They sign in with ${signInWith} using this email`, yahooReady ? "If they'll use Google, add the email to Google Cloud's test users first (Yahoo needs nothing extra)" : "They can sign in once their Google account is also allowed in Google Cloud", "Only pages set to View or Edit show in their sidebar"]}
              yes="Yes, invite admin"
            >Invite</ConfirmButton>
          </div>
        </form>
        </EditDialog>
      </PageHead>
      <Flash params={params} />
      {owners < 2 && <p className="banner alert">Only {owners} Owner. A payment change needs a different Owner to approve it, so invite a second one.</p>}


      <h2 style={{ marginTop: 8 }}>Team · {admins.length}</h2>
      <p className="muted">{online} online now. Online means they've used the admin in the last 5 minutes.</p>
      <div className="table-wrap">
        <table className="stack-table team-table">
          <thead><tr><th>Admin</th><th>Status</th><th>Roles</th><th>Last signed in</th><th><span className="visually-hidden">Edit</span></th></tr></thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email}>
                <td className="strong st-1">{displayName(a)}<br /><span className="small muted">{a.email}{envOwners.includes(a.email) ? " · Owner set in Vercel" : ""}</span></td>
                <td className="st-2" data-label="Status">{isOnline(a) ? <span className="presence on">Online</span> : <span className="presence off">Offline{a.last_active_at ? <small className="muted"><br />active {formatWhen(a.last_active_at)}</small> : null}</span>}</td>
                <td className="st-3" data-label="Roles"><div className="actions">{a.roles.map((r) => <span key={r} className={`chip ${r === "owner" ? "dark" : ""}`}>{ROLE_LABELS[r] || r}</span>)}</div>{Array.isArray(a.pages) && !a.roles.includes("owner") && <span className="small muted">Pages: {PAGES.filter((p) => a.pages.includes(p.key)).map((p) => p.label).join(", ")}</span>}</td>
                <td className="st-4" data-label="Last signed in">{formatWhen(a.last_seen_at)}</td>
                <td className="st-5">
                  <EditDialog label="Edit roles" buttonClass="btn ghost small" title={displayName(a)} lead={`${a.email} · roles decide their pages unless you set pages one by one under Page access.`}>
                    <form action={updateAdmin} className="form">
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
                  </EditDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PageAccess admins={admins} />

      <h2 id="activity-log">Activity log</h2>
      <p className="muted">Every change, by whom and when. Nobody can edit or delete it. Latest 100 shown.</p>
      <ListSearch q="" action="" placeholder="Search the log by person, action or what it was about…" />
      <div className="table-wrap">
        <table className="stack-table dash-log">
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>About</th></tr></thead>
          <tbody>
            {log.length === 0 && <tr><td colSpan={4} className="empty">Nothing yet.</td></tr>}
            {log.map((row, i) => {
              const who = displayName({ ...row, email: row.actor_email });
              return (
                <tr key={i} data-find={`${who} ${row.actor_email} ${actionLabel(row.action)} ${row.target || ""}`.toLowerCase()}>
                  <td className="st-3 dash-when">{formatWhen(row.at)}</td>
                  <td className="st-2" title={row.actor_email}>{who}</td>
                  <td className="st-1"><strong className="dash-what">{actionLabel(row.action)}</strong></td>
                  <td className={`st-4${row.target ? "" : " dash-empty"}`}>{row.target || <span className="muted">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
