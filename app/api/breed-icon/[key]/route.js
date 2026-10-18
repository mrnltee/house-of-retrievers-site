import { hasDatabase, sql } from "../../../lib/db";
import { BREEDS } from "../../../lib/breeds.mjs";

export const dynamic = "force-dynamic";

const KEYS = new Set(BREEDS.filter((b) => b.icon).map((b) => b.key));

/** A breed's icon: HOR's uploaded one when there is one, else the built-in SVG. */
export async function GET(request, { params }) {
  const { key } = await params;
  if (!KEYS.has(key)) return new Response("Not found", { status: 404 });
  const [row] = hasDatabase() ? await sql("SELECT mime, data FROM breed_icons WHERE key = $1", [key]).catch(() => []) : [];
  if (!row) {
    return new Response(null, { status: 307, headers: { Location: new URL(`/breeds/${key}.svg`, request.url).toString(), "Cache-Control": "public, max-age=300" } });
  }
  return new Response(row.data, {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      // An uploaded SVG is a picture, never a page: nothing in it may run or load.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
    },
  });
}
