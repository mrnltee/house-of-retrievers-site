import { pageAdmin, adminBase } from "../../lib/admin/guard";
import { displayName, initialsOf, roleLine } from "../../lib/admin/profile.mjs";
import { can, PAGES } from "../../lib/admin/roles.mjs";
import AdminNav from "./AdminNav";
import GuideTour from "./GuideTour";
import Presence from "./Presence";
import { sql } from "../../lib/db";
import { CHAT_ROOM_DAYS } from "../../lib/admin/chat.mjs";
import { exitPreview } from "../previewActions";
import { HOW, guidePages } from "../../lib/admin/guide.mjs";

// Each page shows when the admin has its first capability (see PAGES).
const page = (key) => {
  const p = PAGES.find((x) => x.key === key);
  return [p.label, p.path, p.view[0]];
};
const GROUPS = [
  ["Run", ["dashboard", "events", "registrations", "checkin", "people", "supporters", "beneficiaries", "guests"].map(page)],
  ["Publish", [["Gallery", null], ["Forms", null], page("media"), ["Content", null]]],
  ["Money", [page("payments"), ["Donations & spending", null]]],
  ["Settings", [page("emails"), page("letters"), page("journey"), page("breeds"), ["Privacy requests", null], ["Admins & activity log", "/admins", "log:view"]]],
  ["Team", [["Team chat", "/chat", "*"]]],
  ["Help", [["Getting started", "/start", "*"]]],
];

export default async function AdminAppLayout({ children }) {
  const { admin } = await pageAdmin();
  const base = await adminBase();
  // Unread team-chat messages from others in the room (last 90 days).
  const [{ unread = 0 } = {}] = admin.preview
    ? []
    : await sql(
        `SELECT count(*)::int AS unread FROM chat_messages WHERE id > $1 AND author_email <> $2 AND created_at > now() - interval '${CHAT_ROOM_DAYS} days'`,
        [admin.chat_read_id || 0, admin.email],
      ).catch(() => [{ unread: 0 }]);
  const groups = GROUPS.map(([label, items]) => [
    label,
    items
      .filter(([, path, cap]) => (path === null ? !Array.isArray(admin.pages) || admin.roles.includes("owner") : cap === "*" || can(admin, cap)))
      .map(([name, path]) => ({ name, href: path === null ? null : path === "/" ? base || "/" : `${base}${path}`, badge: path === "/chat" ? unread : 0 })),
  ]).filter(([, items]) => items.length);

  const href = (path) => (path === "/" ? base || "/" : `${base}${path}`);
  const tour = [
    { title: "Welcome!", text: "This quick guide shows you around the admin. It only takes a minute; press Esc any time to close it." },
    ...guidePages(admin).map((p) => ({
      target: `.admin-side a[href="${href(p.path)}"]`,
      title: p.label,
      text: HOW[p.key].what,
      level: p.level,
      levelText: p.level === "edit" && HOW[p.key].edit ? HOW[p.key].edit : HOW[p.key].view,
    })),
    { target: `.admin-side a[href="${href("/start")}"]`, title: "Getting started", text: "Your guide to the admin is always here, with a “Show me around” button to run this tour again." },
    { target: ".admin-side .me a", title: "Your profile", text: "Your name, role and photo. Open it to edit your profile and see everything you've done in the admin." },
    { target: ".admin-side .me button", title: "Sign out", text: "On a shared or borrowed computer, sign out when you're done. Every change you make is recorded with your name." },
  ];

  return (
    <div className="admin-shell">
      <AdminNav
        groups={groups}
        home={base || "/"}
        me={{ name: displayName(admin), role: roleLine(admin), photo: admin.photo || "", initials: initialsOf(admin), email: admin.email, href: `${base}/profile` }}
      />
      {!admin.preview && <GuideTour steps={tour} autoStart={!admin.guide_hidden} hidden={Boolean(admin.guide_hidden)} sessionKey={`hor-guide-${admin.authTime || 0}`} />}
      {!admin.preview && <Presence />}
      <main className="admin-main" id="admin-main">
        {admin.preview && (
          <div className="banner alert preview-bar" role="status">
            <span><strong>Preview: you're seeing the admin as {admin.name || admin.email}.</strong> Their menu and pages, exactly. Changes are switched off.</span>
            <form action={exitPreview}><button type="submit" className="btn small" data-confirm="none: leaving preview changes nothing">Exit preview</button></form>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
