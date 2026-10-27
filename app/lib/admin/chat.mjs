/** Team chat rules shared by the page and its actions (owner, 2026-10-27). */
export const CHAT_MAX = 2000;
export const CHAT_ROOM_DAYS = 90;

/** Trims a message; { body } or { error }. */
export function cleanMessage(text) {
  const body = String(text ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!body) return { error: "Type a message first." };
  if (body.length > CHAT_MAX) return { error: `Keep it under ${CHAT_MAX} characters.` };
  return { body };
}
