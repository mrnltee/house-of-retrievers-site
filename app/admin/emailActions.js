"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { sendEmail } from "../lib/email";
import { CUSTOM_KINDS, EDITABLE_TEMPLATES, SAMPLE_PERSON, TEMPLATE_LIMITS, passQrImage, renderTemplate, unknownVariables } from "../lib/emailTemplates.mjs";

const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/**
 * Which template the editor is on: a built-in key, or one of HOR's own
 * (`id` set, or `kind` for a new one). `ref` is what renderTemplate takes.
 */
async function target(data) {
  const key = form(data, "key");
  const id = form(data, "id");
  const kind = form(data, "kind");
  if (EDITABLE_TEMPLATES[key]) return { key, ref: key, back: `/emails/${key}`, title: EDITABLE_TEMPLATES[key].title };
  if (id && UUID.test(id)) {
    const [row] = await sql("SELECT id, kind, name FROM custom_email_templates WHERE id = $1", [id]);
    if (!row) await backWith("/emails", "error", "That template was deleted.");
    return { id: row.id, kind: row.kind, ref: `custom:${row.kind}`, back: `/emails/custom/${row.id}`, title: row.name };
  }
  if (!id && CUSTOM_KINDS[kind]) return { kind, ref: `custom:${kind}`, back: `/emails/new?kind=${kind}`, title: CUSTOM_KINDS[kind].title };
  await backWith("/emails", "error", "That email can't be edited.");
}

/** The fields from the editor, trimmed and checked. */
async function readFields(data, t) {
  const back = t.back;
  const fields = {
    subject: form(data, "subject").replace(/\s+/g, " ").trim(),
    greeting: form(data, "greeting").replace(/\s+/g, " ").trim(),
    heading: form(data, "heading").replace(/\s+/g, " ").trim(),
    message: form(data, "message").replace(/\r\n?/g, "\n").trim(),
  };
  if (!fields.subject || !fields.heading || !fields.message) await backWith(back, "error", "Subject, heading and message can't be empty.");
  for (const [name, max] of Object.entries(TEMPLATE_LIMITS)) {
    if (fields[name].length > max) await backWith(back, "error", `The ${name} is too long (up to ${max} characters).`);
  }
  const unknown = unknownVariables(t.ref, fields);
  if (unknown.length) {
    await backWith(back, "error", `Unknown variable: ${unknown.map((v) => `{{${v}}}`).join(", ")}. Use the ones listed beside the editor.`);
  }
  return fields;
}

async function readName(data, back) {
  const name = form(data, "name").replace(/\s+/g, " ").trim();
  if (!name) await backWith(back, "error", "Give the template a name, so you can find it in the lists.");
  if (name.length > 80) await backWith(back, "error", "The name is too long (up to 80 characters).");
  return name;
}

export async function saveEmailTemplate(data) {
  const fallback = form(data, "id") ? `/emails/custom/${form(data, "id")}` : `/emails/${form(data, "key") || ""}`;
  return guarded(fallback, async () => {
    const admin = await actionAdmin("emails:edit");
    const t = await target(data);
    const f = await readFields(data, t);
    if (t.key) {
      await sql(
        `INSERT INTO email_templates (key, subject, greeting, heading, message, updated_by) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (key) DO UPDATE SET subject=$2, greeting=$3, heading=$4, message=$5, updated_by=$6, updated_at=now()`,
        [t.key, f.subject, f.greeting, f.heading, f.message, admin.email],
      );
      await logActivity(admin.email, "email.template", t.title, { template: t.key });
      await backWith(t.back, "ok", "Saved. The next email of this kind uses your wording.");
    }
    const name = await readName(data, t.back);
    {
      if (t.id) {
        await sql(
          "UPDATE custom_email_templates SET name=$2, subject=$3, greeting=$4, heading=$5, message=$6, updated_by=$7, updated_at=now() WHERE id=$1",
          [t.id, name, f.subject, f.greeting, f.heading, f.message, admin.email],
        );
        await logActivity(admin.email, "email.custom", name, { templateId: t.id, kind: t.kind });
        await backWith(t.back, "ok", "Saved.");
      }
      const [row] = await sql(
        `INSERT INTO custom_email_templates (name, kind, subject, greeting, heading, message, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
        [name, t.kind, f.subject, f.greeting, f.heading, f.message, admin.email],
      );
      await logActivity(admin.email, "email.custom.new", name, { templateId: row.id, kind: t.kind });
      await backWith(`/emails/custom/${row.id}`, "ok", t.kind === "event" ? "Template added. Pick it in an event's “Price and sign-ups” section." : "Template added. Send it from a person's profile.");
    }
  });
}

/** Built-in: back to HOR's original wording. Custom: delete the template (events using it go back to the standard email). */
export async function resetEmailTemplate(data) {
  const fallback = form(data, "id") ? `/emails/custom/${form(data, "id")}` : `/emails/${form(data, "key") || ""}`;
  return guarded(fallback, async () => {
    const admin = await actionAdmin("emails:edit");
    const t = await target(data);
    if (t.key) {
      await sql("DELETE FROM email_templates WHERE key = $1", [t.key]);
      await logActivity(admin.email, "email.template", t.title, { template: t.key, reset: true });
      await backWith(t.back, "ok", "Back to HOR's original wording.");
    }
    if (!t.id) await backWith("/emails", "ok", "Nothing to delete.");
    const [{ count }] = await sql("SELECT count(*)::int AS count FROM events WHERE email_template_id = $1", [t.id]);
    await sql("DELETE FROM custom_email_templates WHERE id = $1", [t.id]);
    await logActivity(admin.email, "email.custom.delete", t.title, { templateId: t.id, kind: t.kind, events: count });
    await backWith("/emails", "ok", count ? `Deleted “${t.title}”. ${count === 1 ? "The event" : `The ${count} events`} that used it send the standard confirmation now.` : `Deleted “${t.title}”.`);
  });
}

/** Sends what's in the editor (saved or not) to the signed-in admin, with sample details. */
export async function sendTestEmail(data) {
  const fallback = form(data, "id") ? `/emails/custom/${form(data, "id")}` : `/emails/${form(data, "key") || ""}`;
  return guarded(fallback, async () => {
    const admin = await actionAdmin("emails:edit");
    const t = await target(data);
    const f = await readFields(data, t);
    const event = t.ref === "rsvp-confirmed" || t.ref === "custom:event";
    const mail = renderTemplate(t.ref, f, SAMPLE_PERSON, event ? { button: { label: "Open my pass", href: "https://events.houseofretrieversph.org/" }, image: passQrImage("7KQ2MPX4RT") } : {});
    const sent = await sendEmail({ to: admin.email, ...mail, subject: `[Test] ${mail.subject}`, idempotencyKey: `test/${t.key || t.id || t.kind}/${Date.now()}` });
    if (!sent.ok) await backWith(t.back, "error", sent.skipped ? "Email isn't set up yet (Resend key missing)." : "The test didn't go through. Try again in a moment.");
    await logActivity(admin.email, "email.test", t.title, { template: t.key || t.id || t.kind });
    await backWith(t.back, "ok", `Test sent to ${admin.email}, with sample details (${SAMPLE_PERSON.name}).`);
  });
}
