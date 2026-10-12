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
