import { hasDatabase, sql } from "./db";
import { LETTER_STARTERS, letterWithOverride } from "./letters.mjs";

/** HOR's saved wording for one letter (a letter_templates row), or null. Never throws. */
async function savedRow(key) {
  if (!hasDatabase()) return null;
  try {
    const [row] = await sql("SELECT key, name, subject, cover, body, updated_by, updated_at FROM letter_templates WHERE key = $1", [key]);
    return row || null;
  } catch {
    return null;
  }
}

/** One letter: saved wording over the starter, or null if there's no such letter. */
export async function loadLetter(key) {
  if (!LETTER_STARTERS.some((l) => l.key === key)) return null;
  const row = await savedRow(key);
  return { ...letterWithOverride(key, row), updatedBy: row?.updated_by || null, updatedAt: row?.updated_at || null };
}

/** Every letter, in starter order. */
export async function listLetters() {
  let rows = [];
  if (hasDatabase()) {
    try { rows = await sql("SELECT key, name, subject, cover, body, updated_by, updated_at FROM letter_templates"); } catch { rows = []; }
  }
  return LETTER_STARTERS.map((starter) => {
    const row = rows.find((r) => r.key === starter.key) || null;
    return { ...letterWithOverride(starter.key, row), updatedBy: row?.updated_by || null, updatedAt: row?.updated_at || null };
  });
}

/** The last value typed for each blank label, as { label: value }. Never throws. */
export async function savedValues(labels) {
  if (!hasDatabase() || !labels?.length) return {};
  try {
    const rows = await sql("SELECT label, value FROM letter_saved_values WHERE label = ANY($1::text[])", [labels]);
    return Object.fromEntries(rows.map((r) => [r.label, r.value]));
  } catch {
    return {};
  }
}
