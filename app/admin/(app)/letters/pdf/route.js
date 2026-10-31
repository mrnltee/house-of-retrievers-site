import { sql } from "../../../../lib/db";
import { currentAdmin } from "../../../../lib/admin/auth";
import { can } from "../../../../lib/admin/roles.mjs";
import { LETTER_LIMITS, blanksOf, prepareLetter, recipientFields } from "../../../../lib/letters.mjs";
import { letterPdf } from "../../../../lib/letterPdf.mjs";
import { loadLetter } from "../../../../lib/letterStore";

export const dynamic = "force-dynamic";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

/**
 * A letter as a PDF, to check before sending or to download: posted from the
 * letter editor (sample recipient) or the send page (a chosen recipient and
 * the blanks typed so far). Nothing is saved or sent.
 */
export async function POST(request) {
  const admin = await currentAdmin();
  if (!admin || !can(admin, "letters:view")) return new Response("Not allowed", { status: 403 });
  const data = await request.formData();
  const field = (key) => (typeof data.get(key) === "string" ? data.get(key) : "");
  const saved = await loadLetter(field("letter"));
  if (!saved) return new Response("Not found", { status: 404 });
  // The editor posts its unsaved wording to preview it; that needs the right to edit letters.
  if (field("body") && !can(admin, "letters:edit")) return new Response("Not allowed", { status: 403 });
  const letter = field("body") ? { ...saved, subject: field("subject") || saved.subject, cover: field("cover") || saved.cover, body: field("body").slice(0, LETTER_LIMITS.body) } : saved;
  let typed = {};
  try { typed = JSON.parse(field("values") || "{}"); } catch { typed = {}; }
  const blanks = blanksOf(letter.subject, letter.cover, letter.body);
  const values = Object.fromEntries(blanks.map((b) => [b.label, String(typed[b.label] ?? "").slice(0, LETTER_LIMITS.value) || (field("sample") ? b.suggestion || `[${b.label}]` : "")]));

  let to = { name: "Pawsome Pet Shop", contact: "Jessie Mae Gabriel", address: "123 Katipunan Ave.\nQuezon City 1108", salutation: "Ms. Jessie" };
  // The send page posts its whole form: "previewTo" is the recipient shown in the preview.
  const [type, id] = (field("previewTo") || field("to")).split(":");
  if (type === "supporter" && isUuid(id)) {
    const [row] = await sql("SELECT name, contact_name, address, salutation FROM supporters WHERE id = $1", [id]);
    if (row) to = recipientFields({ supporter: row });
  } else if (type === "person" && isUuid(id)) {
    const [row] = await sql("SELECT name, organization FROM people WHERE id = $1", [id]);
    if (row) to = recipientFields({ person: row });
  } else if (type === "beneficiary" && isUuid(id)) {
    const [row] = await sql("SELECT name, contact_name, address, salutation FROM beneficiaries WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (row) to = recipientFields({ beneficiary: row });
  } else if (type === "contact" && isUuid(id)) {
    const [row] = await sql("SELECT name, organization, address, salutation FROM letter_contacts WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (row) to = recipientFields({ contact: row });
  }
  const prepared = prepareLetter(letter, { ...to, values });
  const pdf = await letterPdf(prepared.blocks, { title: prepared.subject });
  const ascii = prepared.filename.replace(/[^\x20-\x7e]/g, "-").replace(/"/g, "'");
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${field("download") ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(prepared.filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
