import { hasDatabase, sql } from "./db";

/**
 * HOR's saved wording for an editable email ({ subject, greeting, heading,
 * message }), or null to use the built-in default. Never throws: a missing
 * table or database just means the default.
 */
export async function loadTemplate(key) {
  if (!hasDatabase()) return null;
  try {
    const [row] = await sql("SELECT subject, greeting, heading, message FROM email_templates WHERE key = $1", [key]);
    return row || null;
  } catch {
    return null;
  }
}

/** One of HOR's own templates ({ id, name, kind, subject, greeting, heading, message }), or null. */
export async function loadCustomTemplate(id, kind) {
  if (!hasDatabase() || !/^[0-9a-f-]{36}$/i.test(String(id || ""))) return null;
  try {
    const [row] = await sql(
      "SELECT id, name, kind, subject, greeting, heading, message FROM custom_email_templates WHERE id = $1 AND ($2::text IS NULL OR kind = $2)",
      [id, kind || null],
    );
    return row || null;
  } catch {
    return null;
  }
}

/** HOR's own templates, optionally of one kind, by name. Never throws. */
export async function listCustomTemplates(kind) {
  if (!hasDatabase()) return [];
  try {
    return await sql(
      "SELECT id, name, kind, subject, greeting, heading, message, updated_by, updated_at FROM custom_email_templates WHERE ($1::text IS NULL OR kind = $1) ORDER BY lower(name)",
      [kind || null],
    );
  } catch {
    return [];
  }
}

let frameCache = null;

/** The saved sign-off and footer ({ signoff, footer }), or null for HOR's standard ones. Cached a minute; never throws. */
export async function loadEmailFrame({ fresh = false } = {}) {
  if (!hasDatabase()) return null;
  if (!fresh && frameCache && Date.now() - frameCache.at < 60000) return frameCache.frame;
  try {
    const rows = await sql("SELECT key, value FROM email_settings WHERE key IN ('signoff', 'footer')");
    const frame = rows.length ? Object.fromEntries(rows.map((r) => [r.key, r.value])) : null;
    frameCache = { at: Date.now(), frame };
    return frame;
  } catch {
    return null;
  }
}

export function forgetEmailFrame() {
  frameCache = null;
}
