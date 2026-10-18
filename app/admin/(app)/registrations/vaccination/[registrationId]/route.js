import { sql } from "../../../../../lib/db";
import { currentAdmin } from "../../../../../lib/admin/auth";
import { can } from "../../../../../lib/admin/roles.mjs";

export const dynamic = "force-dynamic";

/** Private vaccination record: only signed-in admins who can view registrations. */
export async function GET(request, { params }) {
  const admin = await currentAdmin();
  if (!admin || !can(admin.roles, "registrations:view")) return new Response("Not allowed", { status: 403 });
  const { registrationId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(registrationId)) return new Response("Not found", { status: 404 });
  const index = Number(new URL(request.url).searchParams.get("i") || 0);
  if (!Number.isInteger(index) || index < 0 || index > 9) return new Response("Not found", { status: 404 });
  const [row] = await sql("SELECT mime, data FROM registration_vaccination_records WHERE registration_id = $1 AND furbaby_index = $2", [registrationId, index]);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(row.data, {
    headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
