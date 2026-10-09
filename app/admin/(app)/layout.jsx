import { pageAdmin, adminBase } from "../../lib/admin/guard";
import { can, ROLE_LABELS } from "../../lib/admin/roles.mjs";
import AdminNav from "./AdminNav";

const GROUPS = [
  ["Run", [["Dashboard", "/", "dashboard:view"], ["Events", "/events", "events:view"], ["Registrations", "/registrations", "registrations:view"], ["Check-in", "/checkin", "checkin"], ["People", "/people", "people:view"]]],
  ["Publish", [["Gallery", null], ["Forms", null], ["Content", null]]],
  ["Money", [["Payment settings", "/payments", "payments:view"], ["Donations & spending", null]]],
  ["Settings", [["Privacy requests", null], ["Admins & activity log", "/admins", "log:view"]]],
];

export default async function AdminAppLayout({ children }) {
  const { admin } = await pageAdmin();
  const base = await adminBase();
  const groups = GROUPS.map(([label, items]) => [
    label,
    items
      .filter(([, path, cap]) => path === null || can(admin.roles, cap))
      .map(([name, path]) => ({ name, href: path === null ? null : path === "/" ? base || "/" : `${base}${path}` })),
  ]).filter(([, items]) => items.length);

  return (
    <div className="admin-shell">
      <AdminNav
        groups={groups}
        home={base || "/"}
        email={admin.email}
        roles={admin.roles.map((role) => ROLE_LABELS[role] || role).join(", ") || "No role yet"}
      />
      <main className="admin-main" id="admin-main">{children}</main>
    </div>
  );
}
