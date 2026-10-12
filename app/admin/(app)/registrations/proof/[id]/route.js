import { sql } from "../../../../../lib/db";
import { currentAdmin } from "../../../../../lib/admin/auth";
import { can } from "../../../../../lib/admin/roles.mjs";

export const dynamic = "force-dynamic";

/**
 * A registrant's payment screenshot, for signed-in admins who can see
 * registrations. Cached in the admin's own browser only.
 */
export async function GET(_request, { params }) {
  const admin = await currentAdmin();
  if (!admin || !can(admin.roles, "registrations:view")) return new Response("Not allowed", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [row] = await sql("SELECT mime, data FROM payment_proofs WHERE id = $1", [id]);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(row.data, {
    headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
