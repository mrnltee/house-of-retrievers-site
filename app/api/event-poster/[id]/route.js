import { hasDatabase, sql } from "../../../lib/db";
import { posterVersion } from "../../../lib/posterFrame.mjs";
import { posterFor } from "../../../lib/posterImage";

export const runtime = "nodejs";

/**
 * A public event's poster at 4:5, cut from its kept original when the saved
 * cover isn't 4:5 yet (covers framed before 27 Oct 2026 were 16:10). Read only:
 * nothing is saved. The address carries `?v=` (posterVersion), which changes
 * with the cover, so that version can be cached for a year.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  if (!hasDatabase() || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [event] = await sql(
    "SELECT image, image_source, image_crop FROM events WHERE id = $1 AND status IN ('published', 'cancelled') AND image IS NOT NULL AND image <> ''",
    [id],
  );
  if (!event) return new Response("Not found", { status: 404 });
  // One address per version: any other `v` is sent there before any picture work, so it can't skip the cache.
  const version = posterVersion(event);
  if (new URL(request.url).searchParams.get("v") !== version) {
    return new Response(null, { status: 307, headers: { Location: `/api/event-poster/${id}?v=${version}`, "Cache-Control": "public, max-age=60, s-maxage=60" } });
  }
  const poster = await posterFor(event).catch(() => null);
  if (!poster) return new Response("Not found", { status: 404 });
  return new Response(poster.data, {
    headers: {
      "Content-Type": poster.mime,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
