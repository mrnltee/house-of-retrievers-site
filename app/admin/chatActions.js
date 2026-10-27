"use server";

import { sql } from "../lib/db";
import { actionAdmin } from "../lib/admin/guard";
import { currentAdmin } from "../lib/admin/auth";
import { CHAT_ROOM_DAYS, cleanMessage } from "../lib/admin/chat.mjs";

const ROOM = `SELECT m.id, m.author_email, coalesce(a.name, split_part(m.author_email, '@', 1)) AS author, m.body, m.created_at
  FROM chat_messages m LEFT JOIN admins a ON a.email = m.author_email
  WHERE m.created_at > now() - interval '${CHAT_ROOM_DAYS} days'`;

/** Messages in the room after `afterId` (all recent ones when 0), oldest first. */
export async function loadChat(afterId = 0) {
  const admin = await currentAdmin();
  if (!admin) return { error: "Please sign in again." };
  const after = Number.isSafeInteger(Number(afterId)) ? Number(afterId) : 0;
  const rows = after
    ? await sql(`${ROOM} AND m.id > $1 ORDER BY m.id LIMIT 200`, [after])
    : await sql(`SELECT * FROM (${ROOM} ORDER BY m.id DESC LIMIT 200) x ORDER BY id`);
  const lastId = rows.length ? Number(rows[rows.length - 1].id) : after;
  if (lastId && !admin.preview) await sql("UPDATE admins SET chat_read_id = GREATEST(chat_read_id, $2) WHERE email = $1", [admin.email, lastId]);
  return { me: admin.email, messages: rows.map((r) => ({ id: Number(r.id), mine: r.author_email === admin.email, author: r.author, body: r.body, at: new Date(r.created_at).toISOString() })) };
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
