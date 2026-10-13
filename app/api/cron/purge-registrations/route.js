import { NextResponse } from "next/server";
import { hasDatabase, transaction } from "../../../lib/db";
import { logActivity } from "../../../lib/admin/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** Permanently remove only recoverable registrations whose 30-day window ended. */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401, headers: noStore });
  }
  if (!hasDatabase()) return NextResponse.json({ ok: true, purged: 0 }, { headers: noStore });
  const purged = await transaction(async (tx) => {
    const rows = await tx.sql(
      `DELETE FROM registrations
         WHERE deleted_at < now() - interval '30 days' AND fee_status <> 'paid' AND checked_in_at IS NULL
         RETURNING id, event_id, name`,
    );
    for (const row of rows) await logActivity("System", "registration.purge", row.name, { registrationId: row.id, eventId: row.event_id }, tx.sql);
    return rows.length;
  });
  return NextResponse.json({ ok: true, purged }, { headers: noStore });
}
