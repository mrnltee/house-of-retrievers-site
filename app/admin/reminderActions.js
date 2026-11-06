"use server";

import { revalidatePath } from "next/cache";
import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { sendEmail } from "../lib/email";
import { SAMPLE_PERSON, TEMPLATE_LIMITS, eventReminder, passQrImage, unknownVariables } from "../lib/emailTemplates.mjs";
import { MAX_REMINDERS_PER_SEND, REMINDER_TEST_TO, readReminderIds } from "../lib/eventReminders.mjs";
import { sendReminder } from "../lib/passEmails";

/**
 * The event reminder / guidelines email, sent from an event's Registrations
 * page, one by one or in bulk. Each button that calls these is a
 * ConfirmButton. The wording is whatever the admin settled on in the form.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** The wording from the form, trimmed and checked. */
async function readFields(data, back) {
  const fields = {
    subject: form(data, "subject").replace(/\s+/g, " ").trim(),
    greeting: form(data, "greeting").replace(/\s+/g, " ").trim(),
    heading: form(data, "heading").replace(/\s+/g, " ").trim(),
    message: form(data, "message").replace(/\r\n?/g, "\n").trim(),
  };
  if (!fields.subject) await backWith(back, "error", "Add a subject first.");
  if (!fields.heading) await backWith(back, "error", "Add a heading first.");
  if (!fields.message) await backWith(back, "error", "Write the message first.");
  for (const [name, limit] of Object.entries(TEMPLATE_LIMITS)) {
    if (fields[name].length > limit) await backWith(back, "error", `The ${name} is too long (up to ${limit} characters).`);
  }
  const unknown = unknownVariables("event-reminder", fields);
  if (unknown.length) await backWith(back, "error", `These aren't available here: ${unknown.map((v) => `{{${v}}}`).join(", ")}.`);
  return fields;
}

async function eventFor(id) {
  if (!UUID.test(String(id || ""))) return null;
  const [event] = await sql("SELECT id, title, date, start_time, end_time, all_day, venue, city FROM events WHERE id = $1", [id]);
  return event || null;
}

/** Sends the wording to the ticked registrations, one email each. */
export async function sendEventReminders(data) {
  const eventId = form(data, "eventId");
  const back = `/registrations/${eventId}/reminder`;
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:edit");
    const event = await eventFor(eventId);
    if (!event) await backWith("/registrations", "error", "That event no longer exists.");
    const ids = readReminderIds(data.getAll("ids"));
    if (!ids.length) await backWith(back, "error", "Tick at least one person first.");
    if (ids.length > MAX_REMINDERS_PER_SEND) await backWith(back, "error", `Send up to ${MAX_REMINDERS_PER_SEND} at a time. Untick some and send the rest after.`);
    const fields = await readFields(data, back);
    // Only registrations of this event, never ids from elsewhere.
    const rows = await sql("SELECT id, name FROM registrations WHERE event_id = $1 AND id = ANY($2::uuid[]) AND deleted_at IS NULL", [event.id, ids]);
    const names = new Map(rows.map((r) => [r.id, r.name]));
    let sent = 0;
    const failed = [];
    for (const id of ids.filter((i) => names.has(i))) {
      const result = await sendReminder(id, fields);
      if (result.ok) sent += 1;
      else if (result.skipped) await backWith(back, "error", sent ? `Email isn't set up, so it stopped after ${sent}.` : "Email isn't set up yet (Resend key missing). Nothing was sent.");
      else failed.push(`${names.get(id)}${result.error ? ` (${result.error})` : ""}`);
      await pause(350); // Resend allows a few requests a second
    }
    await logActivity(admin.email, "registration.reminder", event.title, { eventId: event.id, sent, failed: failed.length, subject: fields.subject });
    revalidatePath("/registrations", "layout");
    const missed = ids.length - names.size;
    const problems = [...failed, ...(missed ? [`${missed} not found`] : [])];
    await backWith(back, problems.length && !sent ? "error" : "ok", `Reminder sent to ${sent} ${sent === 1 ? "person" : "people"}.${problems.length ? ` Not sent: ${problems.join(", ")}.` : ""}`);
  });
}

/** Sends what's in the form, with this event's details and a sample name, to HOR's own inbox. */
export async function sendEventReminderTest(data) {
  const eventId = form(data, "eventId");
  const back = `/registrations/${eventId}/reminder`;
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:edit");
    const event = await eventFor(eventId);
    if (!event) await backWith("/registrations", "error", "That event no longer exists.");
    const fields = await readFields(data, back);
    const mail = eventReminder({
      name: SAMPLE_PERSON.name,
      event: { title: event.title, date: String(event.date).slice(0, 10), startTime: event.start_time || undefined, endTime: event.end_time || undefined, allDay: Boolean(event.all_day), venue: event.venue, city: event.city },
      passUrl: "https://events.houseofretrieversph.org/",
      code: "7KQ2MPX4RT",
      custom: fields,
    });
    const sent = await sendEmail({ to: REMINDER_TEST_TO, ...mail, subject: `[Test] ${mail.subject}`, idempotencyKey: `reminder-test/${event.id}/${Date.now()}` });
    if (!sent.ok) await backWith(back, "error", sent.skipped ? "Email isn't set up yet (Resend key missing)." : "The test didn't go through. Try again in a moment.");
    await logActivity(admin.email, "email.test", `${event.title} reminder`, { template: "event-reminder", eventId: event.id });
    await backWith(back, "ok", `Test sent to ${REMINDER_TEST_TO}, with a sample name (${SAMPLE_PERSON.name}). No participant was emailed.`);
  });
}
