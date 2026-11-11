import { notFound } from "next/navigation";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { NotAllowed } from "../../../ui";
import Display from "./Display";

export const metadata = { title: "Check-in display" };

/** The check-in display screen: a laptop or TV that welcomes every guest checked in at the door. */
export default async function CheckInDisplayPage({ params }) {
  const { eventId } = await params;
  const { allowed } = await pageAdmin("checkin");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const [event] = await sql("SELECT id, title, checkin_success_message FROM events WHERE id = $1", [eventId]);
  if (!event) notFound();
  const base = await adminBase();
  return <Display base={base} eventId={event.id} title={event.title} message={event.checkin_success_message} back={`${base}/checkin/${event.id}`} />;
}
