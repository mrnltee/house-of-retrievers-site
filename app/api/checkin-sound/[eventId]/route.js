import { sql } from "../../../lib/db";
import { currentAdmin } from "../../../lib/admin/auth";
import { can } from "../../../lib/admin/roles.mjs";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const admin = await currentAdmin();
  if (!admin || !can(admin, "checkin")) return new Response("Not allowed", { status: 403 });
  const { eventId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return new Response("Not found", { status: 404 });
  const [row] = await sql("SELECT checkin_sound_mime, checkin_sound_data FROM events WHERE id=$1", [eventId]);
  if (!row?.checkin_sound_data || !row.checkin_sound_mime) return new Response("Not found", { status: 404 });
  return new Response(row.checkin_sound_data, { headers: { "Content-Type": row.checkin_sound_mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
