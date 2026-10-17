import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { NotAllowed } from "../../ui";
import Scanner from "./Scanner";

export default async function CheckInPage({ params }) {
  const { eventId } = await params;
  const { allowed } = await pageAdmin("checkin");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const [event] = await sql(
    `SELECT e.id, e.title, e.checkin_success_message, e.checkin_sound_preset, e.checkin_failure_sound_preset, (e.checkin_sound_data IS NOT NULL) AS has_custom_sound,
       (SELECT count(*)::int FROM registrations r WHERE r.event_id=e.id AND r.status='confirmed' AND r.deleted_at IS NULL AND (r.checked_in_at IS NOT NULL OR r.fee_status <> 'waiting' OR r.hold_expires_at IS NULL OR r.hold_expires_at > now())) AS confirmed,
       (SELECT count(*)::int FROM registrations r WHERE r.event_id=e.id AND r.status='confirmed' AND r.deleted_at IS NULL AND r.checked_in_at IS NOT NULL) AS checked
     FROM events e WHERE e.id=$1`,
    [eventId],
  );
  if (!event) notFound();
  return <Scanner base={await adminBase()} eventId={event.id} title={event.title} confirmed={event.confirmed} initialChecked={event.checked} successMessage={event.checkin_success_message} soundPreset={event.checkin_sound_preset} failureSoundPreset={event.checkin_failure_sound_preset} hasCustomSound={event.has_custom_sound} />;
}
