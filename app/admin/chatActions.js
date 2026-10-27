"use server";

import { sql, transaction } from "../lib/db";
import { actionAdmin } from "../lib/admin/guard";
import { currentAdmin } from "../lib/admin/auth";
import { CHAT_ROOM_DAYS, cleanMessage } from "../lib/admin/chat.mjs";
import { shapeMessages } from "../lib/admin/chatView";

const ROOM = `SELECT m.id, m.author_email, coalesce(a.name, split_part(m.author_email, '@', 1)) AS author, m.body, m.created_at, m.edited_at, m.deleted_at
  FROM chat_messages m LEFT JOIN admins a ON a.email = m.author_email
  WHERE m.created_at > now() - interval '${CHAT_ROOM_DAYS} days'`;

/** The room's recent messages (last 200), oldest first, as this admin may see them. */
export async function loadChat() {
  const admin = await currentAdmin();
  if (!admin) return { error: "Please sign in again." };
  const rows = await sql(`SELECT * FROM (${ROOM} ORDER BY m.id DESC LIMIT 200) x ORDER BY id`);
  const lastId = rows.length ? Number(rows[rows.length - 1].id) : 0;
  if (lastId && !admin.preview) await sql("UPDATE admins SET chat_read_id = GREATEST(chat_read_id, $2) WHERE email = $1", [admin.email, lastId]);
  return { owner: admin.roles.includes("owner"), messages: await shapeMessages(rows, admin) };
}

/** Posts a message as the signed-in admin (refused while an Owner previews). */
export async function sendChat(text) {
  let admin;
  try { admin = await actionAdmin(); } catch (error) { return { error: error.message }; }
  const { body, error } = cleanMessage(text);
  if (error) return { error };
  const [recent] = await sql("SELECT count(*)::int AS n FROM chat_messages WHERE author_email = $1 AND created_at > now() - interval '1 minute'", [admin.email]);
  if (recent.n >= 20) return { error: "That's a lot of messages at once. Wait a moment." };
  await sql("INSERT INTO chat_messages (author_email, body) VALUES ($1, $2)", [admin.email, body]);
  return { ok: true };
}

/** Edits your own message; the old wording is kept for Owners. */
export async function editChat(id, text) {
  let admin;
  try { admin = await actionAdmin(); } catch (error) { return { error: error.message }; }
  const { body, error } = cleanMessage(text);
  if (error) return { error };
  return transaction(async (tx) => {
    const [msg] = await tx.sql("SELECT body FROM chat_messages WHERE id = $1 AND author_email = $2 AND deleted_at IS NULL FOR UPDATE", [Number(id) || 0, admin.email]);
    if (!msg) return { error: "You can only edit your own messages." };
    if (msg.body === body) return { ok: true };
    await tx.sql("INSERT INTO chat_message_versions (message_id, body) VALUES ($1, $2)", [Number(id), msg.body]);
    await tx.sql("UPDATE chat_messages SET body = $2, edited_at = now() WHERE id = $1", [Number(id), body]);
    return { ok: true };
  });
}

/** Deletes your own message for everyone except Owners, who still see it marked deleted. */
export async function deleteChat(id) {
  let admin;
  try { admin = await actionAdmin(); } catch (error) { return { error: error.message }; }
  const rows = await sql("UPDATE chat_messages SET deleted_at = now() WHERE id = $1 AND author_email = $2 AND deleted_at IS NULL RETURNING id", [Number(id) || 0, admin.email]);
  return rows.length ? { ok: true } : { error: "You can only delete your own messages." };
}
