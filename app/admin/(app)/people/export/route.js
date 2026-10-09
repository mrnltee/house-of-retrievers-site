import { sql } from "../../../../lib/db";
import { currentAdmin } from "../../../../lib/admin/auth";
import { logActivity } from "../../../../lib/admin/log";
import { can } from "../../../../lib/admin/roles.mjs";

export const dynamic = "force-dynamic";

const KINDS = ["Member", "Volunteer", "Sponsor", "Partner"];

function cell(value) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request) {
  const admin = await currentAdmin();
  if (!admin || !can(admin.roles, "people:view")) return new Response("Not allowed", { status: 403 });
  const kind = new URL(request.url).searchParams.get("kind");
  if (!KINDS.includes(kind)) return new Response("Not found", { status: 404 });
  const rows = await sql(
    "SELECT name, email, social_profile, social_url, organization, furbaby_name, message, status, notes, created_at FROM people WHERE kind=$1 ORDER BY created_at",
    [kind],
  );
  const head = ["Name", "Email", "Social profile", "Social link", "Organization", "Furbaby", "Message", "Status", "Notes", "Joined"];
  const lines = [head.map(cell).join(",")].concat(
    rows.map((r) => [r.name, r.email, r.social_profile, r.social_url, r.organization, r.furbaby_name, r.message, r.status, r.notes, r.created_at.toISOString()].map(cell).join(",")),
  );
  await logActivity(admin.email, "people.export", kind);
  return new Response(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hor-${kind.toLowerCase()}s.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
