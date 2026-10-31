import { hasDatabase, sql } from "./db";
import { LETTER_STARTERS, letterWithOverride } from "./letters.mjs";

const COLUMNS = "key, name, subject, cover, body, signature, updated_by, updated_at, created_at";
const withMeta = (letter, row) => ({ ...letter, updatedBy: row?.updated_by || null, updatedAt: row?.updated_at || null });

/** Saved rows (HOR's wording over a starter, or HOR's own letters), not removed. Never throws. */
async function savedRows(key = null) {
  if (!hasDatabase()) return [];
  try {
    return await sql(`SELECT ${COLUMNS} FROM letter_templates WHERE deleted_at IS NULL AND ($1::text IS NULL OR key = $1) ORDER BY created_at`, [key]);
  } catch {
    return [];
  }
}

/** One letter: saved wording over the starter, HOR's own letter, or null if there's no such letter. */
export async function loadLetter(key) {
  if (typeof key !== "string" || !/^[a-z0-9-]{1,60}$/.test(key)) return null;
  const [row = null] = await savedRows(key);
  const letter = letterWithOverride(key, row);
  return letter ? withMeta(letter, row) : null;
}

/** Every letter: the built-in ones in starter order, then HOR's own in the order they were made. */
export async function listLetters() {
  const rows = await savedRows();
  const builtIn = LETTER_STARTERS.map((starter) => {
    const row = rows.find((r) => r.key === starter.key) || null;
    return withMeta(letterWithOverride(starter.key, row), row);
  });
  const own = rows.filter((r) => !LETTER_STARTERS.some((s) => s.key === r.key)).map((row) => withMeta(letterWithOverride(row.key, row), row));
  return [...builtIn, ...own];
}

/** Saved answers for blank labels: { values: { label: value }, standard: Set of labels filled automatically }. Never throws. */
export async function savedAnswers(labels = null) {
  if (!hasDatabase()) return { values: {}, standard: new Set() };
  try {
    const rows = await sql("SELECT label, value, standard FROM letter_saved_values WHERE $1::text[] IS NULL OR label = ANY($1::text[]) ORDER BY label", [labels]);
    return { values: Object.fromEntries(rows.map((r) => [r.label, r.value])), standard: new Set(rows.filter((r) => r.standard).map((r) => r.label)) };
  } catch {
    return { values: {}, standard: new Set() };
  }
}

/** The last value typed for each blank label, as { label: value }. Never throws. */
export async function savedValues(labels) {
  if (!labels?.length) return {};
  return (await savedAnswers(labels)).values;
}

/** The admin's choice of letter per group, as { group: letterKey }. Never throws. */
export async function groupLetters() {
  if (!hasDatabase()) return {};
  try {
    const rows = await sql("SELECT group_key, letter_key FROM letter_group_letters");
    return Object.fromEntries(rows.map((r) => [r.group_key, r.letter_key]));
  } catch {
    return {};
  }
}

/**
 * The signature image to lay over a letter's PDF: { buffer, x, dy, width }, or
 * null when it's off or has no image. `image` may be a stored address or, from
 * the editor's unsaved preview, a PNG/JPEG data URL. Never throws.
 */
export async function signatureForPdf(settings, upload = "") {
  const { cleanSignature } = await import("./letterSignature.mjs");
  const s = cleanSignature(settings);
  if (!s.on) { if (settings) console.info("letter signature: switched off for this letter"); return null; }
  const why = (reason) => { console.error(`letter signature: left out, ${reason}`); return null; };
  try {
    const data = String(upload || "").match(/^data:image\/(?:png|jpeg);base64,([A-Za-z0-9+/=]+)$/);
    if (data) {
      const buffer = Buffer.from(data[1], "base64");
      return buffer.length <= 700 * 1024 ? { buffer, x: s.x, dy: s.dy, width: s.width } : why("the new image is over 700 KB");
    }
    if (!s.image) return why("no image saved");
    if (!hasDatabase()) return null;
    const [row] = await sql("SELECT mime, data FROM event_images WHERE id = $1", [s.image.split("/").pop()]);
    // pdfkit draws PNG and JPEG only.
    if (!row) return why(`image ${s.image} not found`);
    if (!/^image\/(png|jpeg)$/.test(row.mime)) return why(`image is ${row.mime}, not PNG or JPEG`);
    return { buffer: Buffer.from(row.data), x: s.x, dy: s.dy, width: s.width };
  } catch (error) {
    return why(`image couldn't be loaded (${error?.message || error})`);
  }
}

/**
 * What the PDF will get for a letter's saved signature, in words, for the send
 * page: { ok, text }. Loads the image the same way sending does.
 */
export async function signatureCheck(settings, body = "") {
  const { cleanSignature, hasSignatureMark } = await import("./letterSignature.mjs");
  const s = cleanSignature(settings);
  if (!s.on) return { ok: false, text: settings ? "Signature is switched off for this letter." : "No signature on this letter." };
  if (!s.image) return { ok: false, text: "Signature is on but no image is saved." };
  if (!hasDatabase()) return { ok: false, text: "The database isn't reachable." };
  try {
    const [row] = await sql("SELECT mime, bytes FROM event_images WHERE id = $1", [s.image.split("/").pop()]);
    if (!row) return { ok: false, text: "The saved signature image couldn't be found. Upload it again and save." };
    if (!/^image\/(png|jpeg)$/.test(row.mime)) return { ok: false, text: `The saved image is ${row.mime}; PDFs need PNG or JPEG. Upload it again and save.` };
    const kb = Math.max(1, Math.round(Number(row.bytes || 0) / 1024));
    return { ok: true, text: `Signature included in the PDF (${row.mime.split("/")[1].toUpperCase()}, ${kb} KB, ${hasSignatureMark(body) ? "where the letter marks it" : "above the signatory's name"}).` };
  } catch (error) {
    return { ok: false, text: `The signature image couldn't be loaded (${error?.message || error}).` };
  }
}

