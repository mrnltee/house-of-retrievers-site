"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { emailReady, sendEmail } from "../lib/email";
import { letterCoverEmail } from "../lib/emailTemplates.mjs";
import { LETTER_LIMITS, LETTER_STARTERS, MAX_LETTER_RECIPIENTS, blanksOf, letterDate, missingBlanks, prepareLetter, recipientFields } from "../lib/letters.mjs";
import { letterPdf } from "../lib/letterPdf.mjs";
import { listLetters, loadLetter } from "../lib/letterStore";
import { LETTER_GROUPS } from "../lib/contacts.mjs";

const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const isKey = (key) => LETTER_STARTERS.some((l) => l.key === key);
const looksLikeKey = (key) => /^[a-z0-9-]{1,60}$/.test(String(key || ""));
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

/** Settings → Letters: save HOR's wording for one letter (replaces the starter, or updates HOR's own letter). */
export async function saveLetter(data) {
  const key = form(data, "key");
  const back = looksLikeKey(key) ? `/letters/${key}` : "/letters";
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    if (!looksLikeKey(key) || !(await loadLetter(key))) await backWith("/letters", "error", "That letter doesn't exist.");
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
    // Only built-in letters have an original to go back to; HOR's own letters are removed instead.
    if (!isKey(key)) await backWith("/letters", "error", "This letter has no original wording to go back to.");
    await sql("DELETE FROM letter_templates WHERE key = $1", [key]);
    await logActivity(admin.email, "letter.reset", key, { letter: key });
    await backWith(back, "ok", "Back to the original wording.");
  });
}

/** "supporter:<uuid>" / "person:<uuid>" → rows with who to send to. */
async function loadRecipients(refs) {
  const ids = (kind) => refs.filter((r) => r.startsWith(`${kind}:`)).map((r) => r.slice(kind.length + 1)).filter(isUuid);
  const [supporters, people, contacts, beneficiaries] = await Promise.all([
    ids("supporter").length ? sql("SELECT id, name, kind, contact_email, contact_name, address, salutation FROM supporters WHERE id = ANY($1::uuid[])", [ids("supporter")]) : [],
    ids("person").length ? sql("SELECT id, name, email, organization FROM people WHERE id = ANY($1::uuid[])", [ids("person")]) : [],
    ids("contact").length ? sql("SELECT id, name, organization, email, address, salutation FROM letter_contacts WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL", [ids("contact")]) : [],
    ids("beneficiary").length ? sql("SELECT id, name, contact_name, contact_email, address, salutation FROM beneficiaries WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL", [ids("beneficiary")]) : [],
  ]);
  return [
    ...supporters.map((s) => ({ ref: `supporter:${s.id}`, id: s.id, type: "supporter", ...recipientFields({ supporter: s }), email: (s.contact_email || "").trim() })),
    ...people.map((p) => ({ ref: `person:${p.id}`, id: p.id, type: "person", ...recipientFields({ person: p }), email: (p.email || "").trim() })),
    ...contacts.map((c) => ({ ref: `contact:${c.id}`, id: c.id, type: "contact", ...recipientFields({ contact: c }), email: (c.email || "").trim() })),
    ...beneficiaries.map((b) => ({ ref: `beneficiary:${b.id}`, id: b.id, type: "beneficiary", ...recipientFields({ beneficiary: b }), email: (b.contact_email || "").trim() })),
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
      const prepared = prepareLetter(letter, { ...r, date, values });
      const pdf = await letterPdf(prepared.blocks, { title: prepared.subject });
      const mail = letterCoverEmail({ subject: prepared.subject, cover: prepared.cover, filename: prepared.filename });
      const result = await sendEmail({ to: r.email, ...mail, attachments: [{ filename: prepared.filename, content: pdf }], idempotencyKey: `letter/${letter.key}/${r.ref}/${batch}` });
      if (!result.ok) { failed.push(r.name); continue; }
      sent.push(r.name);
      await logActivity(admin.email, `${r.type}.letter`, r.name, { [`${r.type}Id`]: r.id, letter: letter.key, letterName: letter.name, to: r.email });
      if (r.type === "contact") await sql("UPDATE letter_contacts SET last_letter = $2, last_sent_at = now() WHERE id = $1", [r.id, letter.key]);
      if (r.type === "beneficiary") await sql("UPDATE beneficiaries SET last_letter = $2, last_sent_at = now() WHERE id = $1", [r.id, letter.key]);
      await pause(350); // Resend allows a few requests a second
    }

    // Remember what was typed for next time (contact person, signatory, bank details…).
    for (const [label, value] of Object.entries(values)) {
      if (!value) continue;
      await sql(
        `INSERT INTO letter_saved_values (label, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (label) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()
         WHERE NOT letter_saved_values.standard`,
        [label.slice(0, 400), value, admin.email],
      );
    }

    const parts = [sent.length ? `Sent “${letter.name}” to ${sent.length}` : "Nothing sent"];
    if (skipped.length) parts.push(`no email for ${skipped.join(", ")}`);
    if (failed.length) parts.push(`didn't go through for ${failed.join(", ")} (try again)`);
    await backWith(back, failed.length && !sent.length ? "error" : "ok", `${parts.join("; ")}.`);
  });
}

const slug = (text) => String(text || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "letter";

/** Letters: a new letter of HOR's own, blank or copied from another letter ("from"). */
export async function createLetter(data) {
  return guarded("/letters", async () => {
    const admin = await actionAdmin("letters:edit");
    const from = form(data, "from");
    const source = from ? await loadLetter(from) : null;
    if (from && !source) await backWith("/letters", "error", "The letter to copy wasn't found.");
    const name = (form(data, "name").trim() || (source ? `Copy of ${source.name}` : "")).slice(0, LETTER_LIMITS.name);
    if (!name) await backWith("/letters", "error", "Give the new letter a name.");
    const key = `my-${slug(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const blank = {
      subject: "Subject line",
      cover: "Dear [Salutation],\n\nWarm greetings from The House of Retrievers Society Inc.\n\nOur letter is attached.",
      body: "[Date]\n\n[Their Contact Person?]\n[Company Name]\n[Address?]\n\n**Subject: Subject line**\n\nDear [Salutation]:\n\nWrite the letter here.\n\nSincerely yours,\n\n**[Signatory Name]**\n\n[Signatory Position]\n\n**THE HOUSE OF RETRIEVERS’ SOCIETY, INC.**",
    };
    const l = source || blank;
    await sql(
      `INSERT INTO letter_templates (key, name, subject, cover, body, updated_by, updated_at, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, now(), $6, now())`,
      [key, name, l.subject, l.cover, l.body, admin.email],
    );
    await logActivity(admin.email, "letter.create", name, { letter: key, from: from || null });
    await backWith(`/letters/${key}`, "ok", source ? `Copied “${source.name}”. Edit the copy, then save.` : "New letter made. Write it, then save.");
  });
}

/** Letters: remove one of HOR's own letters (built-in letters can only go back to their original wording). */
export async function deleteLetter(data) {
  const key = form(data, "key");
  return guarded("/letters", async () => {
    const admin = await actionAdmin("letters:edit");
    if (!looksLikeKey(key) || isKey(key)) await backWith("/letters", "error", "Built-in letters can't be removed.");
    const [row] = await sql("UPDATE letter_templates SET deleted_at = now() WHERE key = $1 AND deleted_at IS NULL RETURNING name", [key]);
    if (row) await logActivity(admin.email, "letter.remove", row.name, { letter: key });
    await backWith("/letters", "ok", row ? `Removed “${row.name}”.` : "Already removed.");
  });
}

/** Letters → Standard details: HOR's usual answers; ticked ones fill in by themselves and aren't asked when sending. */
export async function saveStandardDetails(data) {
  return guarded("/letters/details", async () => {
    const admin = await actionAdmin("letters:edit");
    const labels = data.getAll("label").filter((v) => typeof v === "string").slice(0, 300);
    const standard = new Set(data.getAll("standard").filter((v) => typeof v === "string"));
    for (const [i, label] of labels.entries()) {
      const value = String(data.getAll("value")[i] ?? "").trim().slice(0, LETTER_LIMITS.value);
      if (!label || label.length > 400) continue;
      if (!value) {
        await sql("DELETE FROM letter_saved_values WHERE label = $1", [label]);
        continue;
      }
      await sql(
        `INSERT INTO letter_saved_values (label, value, standard, updated_by, updated_at) VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (label) DO UPDATE SET value = EXCLUDED.value, standard = EXCLUDED.standard, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [label, value, standard.has(label), admin.email],
      );
    }
    await logActivity(admin.email, "letter.details", "Standard details", { count: labels.length });
    await backWith("/letters/details", "ok", "Saved. Letters use these from now on.");
  });
}

/** Letters → Which letter each group gets. */
export async function saveGroupLetters(data) {
  return guarded("/letters", async () => {
    const admin = await actionAdmin("letters:edit");
    const keys = new Set((await listLetters()).map((l) => l.key));
    for (const group of LETTER_GROUPS) {
      const letter = form(data, `group-${group.key}`);
      if (!keys.has(letter)) continue;
      await sql(
        `INSERT INTO letter_group_letters (group_key, letter_key, updated_by, updated_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (group_key) DO UPDATE SET letter_key = EXCLUDED.letter_key, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [group.key, letter, admin.email],
      );
    }
    await logActivity(admin.email, "letter.groups", "Which letter each group gets", {});
    await backWith("/letters", "ok", "Saved which letter each group gets.");
  });
}

