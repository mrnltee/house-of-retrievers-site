import { notFound } from "next/navigation";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { TEMPLATE_VARIABLES, EDITABLE_TEMPLATES } from "../../../../../lib/emailTemplates.mjs";
import { listCustomTemplates, loadEmailFrame, loadTemplate } from "../../../../../lib/emailSettings";
import { MAX_REMINDERS_PER_SEND, REMINDER_TEST_TO, reminderEligibility } from "../../../../../lib/eventReminders.mjs";
import { Flash, NotAllowed, PageHead } from "../../../ui";
import ReminderComposer from "./ReminderComposer";

// One email each, with a short pause between, so a big list needs room to finish.
export const maxDuration = 120;

/**
 * Email an event's participants a reminder / guidelines: the wording starts
 * from the saved "Event reminder & guidelines" email and can be changed for
 * this send. Tick who gets it (everyone with a pass by default), or arrive from
 * one registration (?to=) to email just that person.
 */
export default async function EventReminderPage({ params, searchParams }) {
  const { eventId } = await params;
  const query = await searchParams;
  const { allowed } = await pageAdmin("registrations:edit");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const [event] = await sql("SELECT id, title, date, start_time, end_time, all_day, venue, city, fee_required FROM events WHERE id = $1", [eventId]);
  if (!event) notFound();
  const base = await adminBase();
  const rows = await sql(
    "SELECT id, name, email, furbaby_name, status, fee_status, deleted_at, reminder_sent_at, reminder_count FROM registrations WHERE event_id = $1 AND deleted_at IS NULL AND status IN ('confirmed', 'waitlist') ORDER BY lower(name)",
    [eventId],
  );
  const recipients = rows.map((r) => {
    const check = reminderEligibility(r, { feeRequired: event.fee_required });
    return {
      id: r.id, name: r.name, email: r.email, furbaby: r.furbaby_name || "",
      eligible: check.ok, reason: check.ok ? "" : check.reason,
      lastReminded: r.reminder_sent_at ? new Date(r.reminder_sent_at).toISOString() : null, count: r.reminder_count || 0,
    };
  });
  const only = typeof query?.to === "string" && recipients.some((r) => r.id === query.to && r.eligible) ? query.to : "";
  const t = EDITABLE_TEMPLATES["event-reminder"];
  const saved = await loadTemplate("event-reminder");
  const mine = (await listCustomTemplates("reminder")).map((m) => ({ id: m.id, name: m.name, subject: m.subject, greeting: m.greeting, heading: m.heading, message: m.message, details: m.details }));
  return (
    <>
      <p className="small"><a href={`${base}/registrations/${event.id}`}>← {event.title} registrations</a></p>
      <PageHead title="Email participants" lead={`A reminder or guidelines for ${event.title}. Each person gets their own copy with their pass. Test sends go to ${REMINDER_TEST_TO}.`} />
      <Flash params={query} />
      <ReminderComposer
        eventId={event.id}
        event={{ title: event.title, date: String(event.date).slice(0, 10), startTime: event.start_time || undefined, endTime: event.end_time || undefined, allDay: Boolean(event.all_day), venue: event.venue, city: event.city }}
        recipients={recipients}
        preselected={only}
        initial={saved || t.defaults}
        defaults={t.defaults}
        usingSaved={Boolean(saved)}
        mine={mine}
        newHref={`${base}/emails/new?kind=reminder`}
        variables={t.variables.map((name) => [name, TEMPLATE_VARIABLES[name]])}
        frame={await loadEmailFrame()}
        max={MAX_REMINDERS_PER_SEND}
        testTo={REMINDER_TEST_TO}
        templateHref={`${base}/emails/event-reminder`}
      />
    </>
  );
}
