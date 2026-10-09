import { hasDatabase, sql } from "../../../lib/db";

export const runtime = "nodejs";

/**
 * Event cover photos uploaded in the admin. A photo is never changed in place
 * (a new upload gets a new id), so it can be cached for a year.
 */
export async function GET(_request, { params }) {
  const { id } = await params;
  if (!hasDatabase() || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [row] = await sql("SELECT mime, data FROM event_images WHERE id = $1", [id]);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(row.data, {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
