import { sql } from "../../../../../lib/db";
import { currentAdmin } from "../../../../../lib/admin/auth";
import { can } from "../../../../../lib/admin/roles.mjs";

export const dynamic = "force-dynamic";

/**
 * A person's Join-form photo (the small copy), for signed-in admins only.
 * Cached in the admin's own browser, never by a shared cache.
 */
export async function GET(_request, { params }) {
  const admin = await currentAdmin();
  if (!admin || !can(admin.roles, "people:view")) return new Response("Not allowed", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [row] = await sql("SELECT mime, data FROM person_photos WHERE id = $1", [id]);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(row.data, {
    headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
