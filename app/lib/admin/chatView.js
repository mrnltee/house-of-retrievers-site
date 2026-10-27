import { sql } from "../db";

/**
 * One message as the viewer may see it: a deleted message's text and every
 * message's earlier versions only for Owners.
 */
export async function shapeMessages(rows, admin) {
  const owner = admin.roles.includes("owner");
  const ids = rows.filter((r) => r.edited_at).map((r) => r.id);
  const versions = owner && ids.length
    ? await sql("SELECT message_id, body, replaced_at FROM chat_message_versions WHERE message_id = ANY($1::bigint[]) ORDER BY id", [ids])
    : [];
  return rows.map((r) => ({
    id: Number(r.id),
    mine: r.author_email === admin.email,
    author: r.author,
    at: new Date(r.created_at).toISOString(),
    edited: Boolean(r.edited_at),
    deleted: Boolean(r.deleted_at),
    body: r.deleted_at && !owner ? null : r.body,
    history: owner ? versions.filter((v) => String(v.message_id) === String(r.id)).map((v) => ({ body: v.body, at: new Date(v.replaced_at).toISOString() })) : [],
  }));
}

