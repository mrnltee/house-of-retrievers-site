import { sql } from "../../../lib/db";
import { pageAdmin } from "../../../lib/admin/guard";
import { actionLabel } from "../../../lib/admin/activity.mjs";
import { PROFILE_LIMITS, SHOW_AS, displayName, firstNameOf, initialsOf, roleLine } from "../../../lib/admin/profile.mjs";
import { saveMyProfile } from "../../profileActions";
import ConfirmButton from "../ConfirmButton";
import ImageField from "../ImageField";
import { Flash, PageHead, formatWhen } from "../ui";

/** My profile (owner, 2026-10-31): your name, furbaby, photo, and everything you've done in the admin. */
export default async function ProfilePage({ searchParams }) {
  const params = await searchParams;
  const { admin } = await pageAdmin();
  const activity = await sql("SELECT at, action, target FROM activity_log WHERE actor_email = $1 ORDER BY at DESC LIMIT 100", [admin.email]);
  const first = admin.first_name || firstNameOf(admin.name);
  return (
    <>
      <PageHead title="My profile" lead="How your name shows in the admin, and a record of what you've done here." />
      <Flash params={params} />
      <div className="profile-card card">
        <span className="profile-avatar" aria-hidden="true">{admin.photo ? <img src={admin.photo} alt="" /> : initialsOf(admin)}</span>
        <div>
          <p className="profile-name">{displayName(admin)}</p>
          <p className="small muted" style={{ margin: 0 }}>{roleLine(admin)} · {admin.email}</p>
        </div>
      </div>

      <form action={saveMyProfile} className="card form" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Edit profile</h2>
        <fieldset disabled={Boolean(admin.preview)} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 14 }}>
          <ImageField name="photo" label="Photo" hint="Optional. Without one, your initials show." current={admin.photo || ""} round maxEdge={600} />
          <div className="row-3">
            <label className="field"><span>Full name</span><input type="text" name="name" required maxLength={PROFILE_LIMITS.name} defaultValue={admin.name || ""} placeholder="Shey Santos" /></label>
            <label className="field"><span>First name <small>Or what people call you</small></span><input type="text" name="firstName" maxLength={PROFILE_LIMITS.firstName} defaultValue={first} placeholder="Shey" /></label>
            <label className="field"><span>Furbaby&apos;s name <small>Optional</small></span><input type="text" name="furbabyName" maxLength={PROFILE_LIMITS.furbabyName} defaultValue={admin.furbaby_name || ""} placeholder="Macchiato" /></label>
          </div>
          <fieldset className="field plain">
            <legend className="field-head">Show my name as</legend>
            {SHOW_AS.map(([key, label]) => (
              <label key={key} className="check">
                <input type="radio" name="showAs" value={key} defaultChecked={(admin.show_as || "full") === key} />
                <span>{label} <span className="small muted">· e.g. {key === "first" ? `${first || "Shey"} / ${admin.furbaby_name || "Macchiato"}` : admin.name || "Shey Santos"}</span></span>
              </label>
            ))}
          </fieldset>
          <p className="small muted" style={{ margin: 0 }}>Email and role can&apos;t be changed here; an Owner sets them in Admins & activity log.</p>
          <div className="actions">
            <ConfirmButton className="btn dark" title="Save your profile?" items={["Your name and photo show in the sidebar and wherever your name appears"]} yes="Yes, save">Save profile</ConfirmButton>
          </div>
        </fieldset>
      </form>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>My activity</h2>
        <p className="small muted">Your last {activity.length === 100 ? "100 " : ""}changes, newest first.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>What</th><th>On</th></tr></thead>
            <tbody>
              {activity.length === 0 && <tr><td colSpan={3} className="empty">Nothing yet.</td></tr>}
              {activity.map((row, i) => <tr key={i}><td className="small">{formatWhen(row.at)}</td><td>{actionLabel(row.action)}</td><td>{row.target || "—"}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
