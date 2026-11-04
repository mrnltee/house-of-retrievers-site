import { sql } from "./db";
import { HOUSE_DEFAULT } from "./emailDesign.mjs";

/** Library designs (event_id null) and, with eventId, that event's own copies first. Never the house row. */
export async function listDesigns({ eventId = null, withLibrary = true } = {}) {
  return sql(
    `SELECT id, kind, name, subject, event_id, based_on, updated_by, updated_at FROM email_designs
      WHERE kind <> 'house' AND (($1::uuid IS NOT NULL AND event_id = $1) OR ($2 AND event_id IS NULL))
      ORDER BY (event_id IS NULL), kind, lower(name)`,
    [eventId, withLibrary],
  );
}

export async function loadDesign(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) return null;
  const [row] = await sql("SELECT * FROM email_designs WHERE id = $1", [id]);
  return row || null;
}

/** HOR's shared header and footer: the saved house row, else the default. */
export async function loadHouse() {
  const [row] = await sql("SELECT doc FROM email_designs WHERE kind = 'house'");
  return row ? { header: row.doc.header || HOUSE_DEFAULT.header, footer: row.doc.footer || HOUSE_DEFAULT.footer } : HOUSE_DEFAULT;
}
