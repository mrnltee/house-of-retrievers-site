import { pageAdmin, adminBase } from "../../lib/admin/guard";
import { can, PAGES, ROLE_LABELS } from "../../lib/admin/roles.mjs";
import AdminNav from "./AdminNav";

// Each page shows when the admin has its first capability (see PAGES).
const page = (key) => {
  const p = PAGES.find((x) => x.key === key);
  return [p.label, p.path, p.view[0]];
};
const GROUPS = [
  ["Run", ["dashboard", "events", "registrations", "checkin", "people", "supporters"].map(page)],
  ["Publish", [["Gallery", null], ["Forms", null], page("media"), ["Content", null]]],
  ["Money", [page("payments"), ["Donations & spending", null]]],
  ["Settings", [page("emails"), page("letters"), page("journey"), page("breeds"), ["Privacy requests", null], ["Admins & activity log", "/admins", "log:view"]]],
  ["Help", [["Getting started", "/start", "*"]]],
];

export default async function AdminAppLayout({ children }) {
  const { admin } = await pageAdmin();
  const base = await adminBase();
  const groups = GROUPS.map(([label, items]) => [
    label,
    items
      .filter(([, path, cap]) => (path === null ? !Array.isArray(admin.pages) || admin.roles.includes("owner") : cap === "*" || can(admin, cap)))
      .map(([name, path]) => ({ name, href: path === null ? null : path === "/" ? base || "/" : `${base}${path}` })),
  ]).filter(([, items]) => items.length);

  return (
    <div className="admin-shell">
      <AdminNav
        groups={groups}
        home={base || "/"}
        email={admin.email}
        roles={Array.isArray(admin.pages) && !admin.roles.includes("owner") ? "Chosen pages" : admin.roles.map((role) => ROLE_LABELS[role] || role).join(", ") || "No role yet"}
      />
      <main className="admin-main" id="admin-main">
        {!admin.welcomed_at && (
          <p className="banner ok welcome">
            <strong>Welcome to the House of Retrievers admin!</strong> New here? Read the two-minute <a href={`${base}/start`}>Getting started</a> guide: what each of your pages is for and what you can change.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
