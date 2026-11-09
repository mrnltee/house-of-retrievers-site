import { hasDatabase, sql } from "../../../lib/db";
import { currentAdmin } from "../../../lib/admin/auth";
import { imageAccess } from "../../../lib/imageAccess.mjs";

export const runtime = "nodejs";

/**
 * Pictures uploaded in the admin. Public ones (event posters, logos…) are never
 * changed in place (a new upload gets a new id), so they are cached for a year.
 * Private ones (letter signature, Guest list, admin profiles; migration 097) go
 * to signed-in admins only; anyone else gets the same "Not found" as a wrong id.
 */
export async function GET(_request, { params }) {
  const { id } = await params;
  if (!hasDatabase() || !/^[0-9a-f-]{36}$/i.test(id)) return notFound();
  const [row] = await sql("SELECT mime, data, private FROM event_images WHERE id = $1", [id]);
  if (!row) return notFound();
  const access = imageAccess({ isPrivate: row.private, isAdmin: row.private ? Boolean(await currentAdmin()) : false });
  if (!access.ok) return notFound();
  return new Response(row.data, {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": access.cache,
      "X-Content-Type-Options": "nosniff",
      ...(row.private ? { Vary: "Cookie" } : {}),
    },
  });
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}
