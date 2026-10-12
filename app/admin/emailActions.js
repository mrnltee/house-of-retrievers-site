"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { sendEmail } from "../lib/email";
import { EDITABLE_TEMPLATES, TEMPLATE_LIMITS, renderTemplate, unknownVariables } from "../lib/emailTemplates.mjs";

const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** The four fields from the editor, trimmed and checked. */
async function readFields(data, key, back) {
  if (!EDITABLE_TEMPLATES[key]) await backWith("/emails", "error", "That email can't be edited.");
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
  const unknown = unknownVariables(key, fields);
  if (unknown.length) {
    await backWith(back, "error", `Unknown variable: ${unknown.map((v) => `{{${v}}}`).join(", ")}. Use the ones listed beside the editor.`);
  }
  return fields;
}

export async function saveEmailTemplate(data) {
  const key = form(data, "key");
  const back = `/emails/${key}`;
  return guarded(back, async () => {
    const admin = await actionAdmin("people:edit");
    const f = await readFields(data, key, back);
    await sql(
      `INSERT INTO email_templates (key, subject, greeting, heading, message, updated_by) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (key) DO UPDATE SET subject=$2, greeting=$3, heading=$4, message=$5, updated_by=$6, updated_at=now()`,
      [key, f.subject, f.greeting, f.heading, f.message, admin.email],
    );
    await logActivity(admin.email, "email.template", EDITABLE_TEMPLATES[key].title, { template: key });
    await backWith(back, "ok", "Saved. The next email of this kind uses your wording.");
  });
}

export async function resetEmailTemplate(data) {
  const key = form(data, "key");
  const back = `/emails/${key}`;
  return guarded(back, async () => {
    const admin = await actionAdmin("people:edit");
    if (!EDITABLE_TEMPLATES[key]) await backWith("/emails", "error", "That email can't be edited.");
    await sql("DELETE FROM email_templates WHERE key = $1", [key]);
    await logActivity(admin.email, "email.template", EDITABLE_TEMPLATES[key].title, { template: key, reset: true });
    await backWith(back, "ok", "Back to HOR's original wording.");
  });
}

/** Sends what's in the editor (saved or not) to the signed-in admin, with sample details. */
export async function sendTestEmail(data) {
  const key = form(data, "key");
  const back = `/emails/${key}`;
  return guarded(back, async () => {
    const admin = await actionAdmin("people:edit");
    const f = await readFields(data, key, back);
    const mail = renderTemplate(key, f, { name: "Juan dela Cruz", furbaby: "Mochi", memberNo: "HOR-26-0001" });
    const sent = await sendEmail({ to: admin.email, ...mail, subject: `[Test] ${mail.subject}`, idempotencyKey: `test/${key}/${Date.now()}` });
    if (!sent.ok) await backWith(back, "error", sent.skipped ? "Email isn't set up yet (Resend key missing)." : "The test didn't go through. Try again in a moment.");
    await logActivity(admin.email, "email.test", EDITABLE_TEMPLATES[key].title, { template: key });
    await backWith(back, "ok", `Test sent to ${admin.email}, with sample details (Juan dela Cruz, Mochi, HOR-26-0001).`);
  });
}
