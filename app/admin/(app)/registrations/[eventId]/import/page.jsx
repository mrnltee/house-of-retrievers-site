import { notFound } from "next/navigation";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { eventTiers } from "../../../../../lib/admin/events.mjs";
import { NotAllowed, PageHead } from "../../../ui";
import SheetImport from "../../../SheetImport";

/** Adds many registrations to one event from an Excel or CSV sheet. */
export default async function ImportRegistrationsPage({ params }) {
  const { eventId } = await params;
  const { allowed } = await pageAdmin("registrations:edit");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const [event] = await sql("SELECT id, title, fee_required, price_tiers, cost FROM events WHERE id = $1", [eventId]);
  if (!event) notFound();
  const base = await adminBase();
  const tickets = event.fee_required ? eventTiers(event).map((t) => t.label).filter(Boolean) : [];
  return (
    <>
      <p className="small"><a href={`${base}/registrations/${event.id}`}>← {event.title}</a></p>
      <PageHead
        title="Import registrations"
        lead={`Add many registrants to ${event.title} from Excel or a CSV. Someone already registered (same name and email) is skipped, and no emails or passes are sent — send passes from the list when you're ready.${tickets.length ? ` Ticket names: ${tickets.join(", ")}.` : ""}`}
      />
      <SheetImport target="registrations" eventId={event.id} backHref={`${base}/registrations/${event.id}`} />
    </>
  );
}
