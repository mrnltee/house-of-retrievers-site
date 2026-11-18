import { sql } from "../../../lib/db";
import HowTo from "../HowTo";
import { PAGE_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import { pageAdmin } from "../../../lib/admin/guard";
import { actionLabel } from "../../../lib/admin/activity.mjs";
import { roleLine } from "../../../lib/admin/profile.mjs";
import { saveMyProfile } from "../../profileActions";
import ListSearch from "../ListSearch";
import { Flash, PageHead } from "../ui";
import ProfileForm from "./ProfileForm";

const manilaDay = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(value));
const manilaTime = (value) => new Intl.DateTimeFormat("en-PH", { timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
function dayLabel(day, today) {
  const diff = Math.round((Date.parse(today) - Date.parse(day)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-PH", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}

/**
 * My profile (owner, 2026-10-31; design review 18 Nov 2026): one card with the photo, names and a live preview of
 * how the team sees you; your email and role below it; then your activity grouped by day, searchable.
 */
export default async function ProfilePage({ searchParams }) {
  const params = await searchParams;
  const { admin } = await pageAdmin();
  const activity = await sql("SELECT at, action, target FROM activity_log WHERE actor_email = $1 ORDER BY at DESC LIMIT 100", [admin.email]);
  const today = manilaDay(Date.now());
  const days = [];
  for (const row of activity) {
    const day = manilaDay(row.at);
    if (days.at(-1)?.day !== day) days.push({ day, rows: [] });
    days.at(-1).rows.push(row);
  }

  return (
    <>
      <PageHead title="My profile" lead="How you appear to the rest of the team, and everything you've done in the admin." ><HowTo guide={PAGE_GUIDES.profile[0]} guides={PAGE_GUIDES.profile} className="btn ghost" /></PageHead>
      <Flash params={params} />
      <ProfileForm action={saveMyProfile} admin={{ name: admin.name, first_name: admin.first_name, furbaby_name: admin.furbaby_name, show_as: admin.show_as, photo: admin.photo, email: admin.email }} role={roleLine(admin)} disabled={Boolean(admin.preview)} />
      <dl className="profile-account">
        <div><dt>Signs in with</dt><dd>{admin.email}</dd></div>
        <div><dt>Role</dt><dd>{roleLine(admin)}</dd></div>
        <p className="small muted">An Owner changes these in Admins &amp; activity log.</p>
      </dl>

      <section className="card" aria-labelledby="my-activity">
        <h2 id="my-activity">My activity</h2>
        <p className="small muted">{activity.length ? `Your last ${activity.length === 100 ? "100 " : ""}changes, newest first.` : "Nothing yet. Everything you save, send or delete will be listed here."}</p>
        {activity.length > 0 && <ListSearch q="" action="" placeholder="Search your activity…" />}
        {days.map(({ day, rows }) => (
          <div key={day} className="profile-day" data-find-group="">
            <h3>{dayLabel(day, today)}</h3>
            <ol className="profile-log">
              {rows.map((row, i) => (
                <li key={i} data-find={`${actionLabel(row.action)} ${row.target || ""}`.toLowerCase()}>
                  <time dateTime={new Date(row.at).toISOString()}>{manilaTime(row.at)}</time>
                  <span className="profile-log-what">{actionLabel(row.action)}</span>
                  {row.target && <span className="profile-log-on">{row.target}</span>}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>
    </>
  );
}
