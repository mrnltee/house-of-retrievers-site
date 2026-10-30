"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { emailReady, sendEmail } from "../lib/email";
import { letterCoverEmail } from "../lib/emailTemplates.mjs";
import { LETTER_LIMITS, LETTER_STARTERS, MAX_LETTER_RECIPIENTS, blanksOf, letterDate, missingBlanks, prepareLetter, recipientName } from "../lib/letters.mjs";
import { letterPdf } from "../lib/letterPdf.mjs";
import { loadLetter } from "../lib/letterStore";

const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const isKey = (key) => LETTER_STARTERS.some((l) => l.key === key);
const looksLikeEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** Settings → Letters: save HOR's wording for one letter (replaces the starter). */
export async function saveLetter(data) {
  const key = form(data, "key");
  const back = isKey(key) ? `/letters/${key}` : "/letters";
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    if (!isKey(key)) await backWith("/letters", "error", "That letter doesn't exist.");
    const f = { name: form(data, "name").trim(), subject: form(data, "subject").replace(/\s+/g, " ").trim(), cover: form(data, "cover").replace(/\r\n?/g, "\n").trim(), body: form(data, "body").replace(/\r\n?/g, "\n").trim() };
    for (const [field, max] of Object.entries({ name: LETTER_LIMITS.name, subject: LETTER_LIMITS.subject, cover: LETTER_LIMITS.cover, body: LETTER_LIMITS.body })) {
      if (!f[field]) await backWith(back, "error", `The ${field === "body" ? "letter" : field} can't be empty.`);
      if (f[field].length > max) await backWith(back, "error", `The ${field === "body" ? "letter" : field} is too long (${max.toLocaleString("en-PH")} characters at most).`);
    }
    await sql(
      `INSERT INTO letter_templates (key, name, subject, cover, body, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, subject = EXCLUDED.subject, cover = EXCLUDED.cover, body = EXCLUDED.body, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [key, f.name, f.subject, f.cover, f.body, admin.email],
    );
    await logActivity(admin.email, "letter.save", f.name, { letter: key });
    await backWith(back, "ok", "Saved. Letters sent from now on use this wording.");
  });
}

/** Back to the wording converted from HOR's Word file. */
export async function resetLetter(data) {
  const key = form(data, "key");
  const back = isKey(key) ? `/letters/${key}` : "/letters";
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    await sql("DELETE FROM letter_templates WHERE key = $1", [key]);
    await logActivity(admin.email, "letter.reset", key, { letter: key });
    await backWith(back, "ok", "Back to the original wording.");
  });
}

/** "supporter:<uuid>" / "person:<uuid>" → rows with who to send to. */
async function loadRecipients(refs) {
  const ids = (kind) => refs.filter((r) => r.startsWith(`${kind}:`)).map((r) => r.slice(kind.length + 1)).filter(isUuid);
  const [supporters, people, contacts] = await Promise.all([
    ids("supporter").length ? sql("SELECT id, name, kind, contact_email FROM supporters WHERE id = ANY($1::uuid[])", [ids("supporter")]) : [],
    ids("person").length ? sql("SELECT id, name, email, organization FROM people WHERE id = ANY($1::uuid[])", [ids("person")]) : [],
    ids("contact").length ? sql("SELECT id, name, email FROM letter_contacts WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL", [ids("contact")]) : [],
  ]);
  return [
    ...supporters.map((s) => ({ ref: `supporter:${s.id}`, id: s.id, type: "supporter", name: recipientName({ supporter: s }), email: (s.contact_email || "").trim() })),
    ...people.map((p) => ({ ref: `person:${p.id}`, id: p.id, type: "person", name: recipientName({ person: p }), email: (p.email || "").trim() })),
    ...contacts.map((c) => ({ ref: `contact:${c.id}`, id: c.id, type: "contact", name: c.name, email: (c.email || "").trim() })),
  ];
}

/**
 * Sends a letter: for each recipient with an email, the letter filled in with
 * their name becomes a PDF attached to a short covering email. Blanks are the
 * same for everyone in the send and are remembered for next time.
 */
export async function sendLetters(data) {
  const back = form(data, "back").startsWith("/letters/send") ? form(data, "back") : "/letters/send";
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    if (!emailReady()) await backWith(back, "error", "Email isn't set up yet (Resend key missing).");
    const letter = await loadLetter(form(data, "letter"));
    if (!letter) await backWith(back, "error", "Pick a letter.");
    const blanks = blanksOf(letter.subject, letter.cover, letter.body);
    let typed = {};
    try { typed = JSON.parse(form(data, "values") || "{}"); } catch { typed = {}; }
    const values = Object.fromEntries(blanks.map((b) => [b.label, String(typed[b.label] ?? "").trim().slice(0, LETTER_LIMITS.value)]));
    const missing = missingBlanks(blanks, values);
    if (missing.length) await backWith(back, "error", `Fill in: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? ` and ${missing.length - 4} more` : ""}.`);

    const refs = [...new Set(data.getAll("to").filter((v) => typeof v === "string"))];
    if (!refs.length) await backWith(back, "error", "Tick at least one recipient.");
    if (refs.length > MAX_LETTER_RECIPIENTS) await backWith(back, "error", `Send to ${MAX_LETTER_RECIPIENTS} at most at a time.`);
    const recipients = await loadRecipients(refs);

    const date = letterDate();
    const batch = Date.now();
    const sent = [];
    const skipped = [];
    const failed = [];
    for (const r of recipients) {
      if (!looksLikeEmail(r.email)) { skipped.push(r.name); continue; }
      const prepared = prepareLetter(letter, { name: r.name, date, values });
      const pdf = await letterPdf(prepared.blocks, { title: prepared.subject });
      const mail = letterCoverEmail({ subject: prepared.subject, cover: prepared.cover, filename: prepared.filename });
      const result = await sendEmail({ to: r.email, ...mail, attachments: [{ filename: prepared.filename, content: pdf }], idempotencyKey: `letter/${letter.key}/${r.ref}/${batch}` });
      if (!result.ok) { failed.push(r.name); continue; }
      sent.push(r.name);
      await logActivity(admin.email, `${r.type}.letter`, r.name, { [`${r.type}Id`]: r.id, letter: letter.key, letterName: letter.name, to: r.email });
      if (r.type === "contact") await sql("UPDATE letter_contacts SET last_letter = $2, last_sent_at = now() WHERE id = $1", [r.id, letter.key]);
      await pause(350); // Resend allows a few requests a second
    }

    // Remember what was typed for next time (contact person, signatory, bank details…).
    for (const [label, value] of Object.entries(values)) {
      if (!value) continue;
      await sql(
        `INSERT INTO letter_saved_values (label, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (label) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [label.slice(0, 400), value, admin.email],
      );
    }

    const parts = [sent.length ? `Sent “${letter.name}” to ${sent.length}` : "Nothing sent"];
    if (skipped.length) parts.push(`no email for ${skipped.join(", ")}`);
    if (failed.length) parts.push(`didn't go through for ${failed.join(", ")} (try again)`);
    await backWith(back, failed.length && !sent.length ? "error" : "ok", `${parts.join("; ")}.`);
  });
}
