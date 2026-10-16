import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { normalizeCode } from "../../../../lib/admin/registrations.mjs";

export async function POST(request, { params }) {
  const code = normalizeCode((await params).code);
  const form = await request.formData();
  const name = String(form.get("consentName") || "").trim();
  const guardian = String(form.get("guardianName") || "").trim();
  if (form.get("agree") !== "on" || !name) return NextResponse.json({ error: "Tick the agreement and type your registered name." }, { status: 422 });
  const [row] = await sql("SELECT r.id, r.name, r.under_18, r.status, e.rsvp_form_config FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.check_in_code=$1 AND r.deleted_at IS NULL", [code]);
  if (!row || row.status === "cancelled" || !row.rsvp_form_config?.consentEnabled) return NextResponse.json({ error: "That acknowledgement is no longer available." }, { status: 404 });
  if (row.under_18 && !guardian) return NextResponse.json({ error: "Add the guardian's name." }, { status: 422 });
  if (name.toLocaleLowerCase() !== String(row.name).trim().toLocaleLowerCase()) return NextResponse.json({ error: "Type the registered name exactly as shown." }, { status: 422 });
  await sql("UPDATE registrations SET consent_completed_at=now(), consent_name=$2, consent_version=$3 WHERE id=$1", [row.id, name, "v1"]);
  return NextResponse.json({ ok: true });
}
