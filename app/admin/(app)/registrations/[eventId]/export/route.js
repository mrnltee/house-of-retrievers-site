import { FEE_STATUS, payMethodLabel } from "../../../../../lib/eventPayments.mjs";
import { sql } from "../../../../../lib/db";
import { currentAdmin } from "../../../../../lib/admin/auth";
import { logActivity } from "../../../../../lib/admin/log";
import { can } from "../../../../../lib/admin/roles.mjs";

export const dynamic = "force-dynamic";

/** Quote a CSV cell, and neutralise spreadsheet formulas (=, +, -, @). */
function cell(value) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(_request, { params }) {
  const { eventId } = await params;
  const admin = await currentAdmin();
  if (!admin || !can(admin.roles, "registrations:view")) return new Response("Not allowed", { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return new Response("Not found", { status: 404 });
  const [event] = await sql("SELECT title, slug FROM events WHERE id=$1", [eventId]);
  if (!event) return new Response("Not found", { status: 404 });
  const rows = await sql(
    `SELECT name, email, furbaby_name, human_count, furbaby_count, photo_consent, under_18, guardian_name, status, fee_status, fee_reference, checked_in_at, created_at,
            ticket_label, ticket_amount, amount_due, pay_method, pay_amount, fee_checked_by, added_by
     FROM registrations WHERE event_id=$1 AND deleted_at IS NULL ORDER BY created_at`,
    [eventId],
  );
  const head = ["Name", "Email", "Furbaby", "People", "Furbabies", "Photo consent", "Under 18", "Guardian", "Status", "Fee", "Reference", "Checked in", "Registered", "Ticket", "Amount due", "Paid with", "Amount sent", "Checked by", "Added by"];
  const lines = [head.map(cell).join(",")].concat(
    rows.map((r) => [r.name, r.email, r.furbaby_name, r.human_count ?? 1, r.furbaby_count ?? 0, r.photo_consent ? "Yes" : "No", r.under_18 ? "Yes" : "No", r.guardian_name, r.status, FEE_STATUS[r.fee_status]?.label || r.fee_status, r.fee_reference, r.checked_in_at?.toISOString?.() || "", r.created_at.toISOString(), r.ticket_label, r.amount_due ?? r.ticket_amount, payMethodLabel(r.pay_method), r.pay_amount, r.fee_checked_by, r.added_by].map(cell).join(",")),
  );
  await logActivity(admin.email, "registration.export", event.title);
  return new Response(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-registrations.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
