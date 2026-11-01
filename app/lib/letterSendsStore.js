import { sql } from "./db";
import { emailLastEvent } from "./email";
import { settled, statusFromEvent } from "./letterSends.mjs";

/** Logs one letter email: sent (with Resend's id) or failed (with why). Never stops a send. */
export async function logSend({ ref, letterKey, to, cc = [], result, by, eventId = null }) {
  try {
    await sql(
      `INSERT INTO letter_sends (ref, letter_key, email_to, cc, provider_id, status, detail, sent_by, event_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [ref, letterKey, to, cc, result?.id || null, result?.ok ? "sent" : "failed", result?.ok ? null : result?.error || null, by, eventId],
    );
  } catch (error) {
    console.warn("letter send not logged", error?.message);
  }
}

/**
 * Asks Resend about recent letters still waiting for news (sent in the last
 * 14 days, not checked in the last 2 minutes), a few at a time so the page
 * stays quick. Statuses that change are saved with the time we noticed.
 */
export async function refreshSends(refs, { max = 15 } = {}) {
  if (!refs?.length) return;
  try {
    const rows = await sql(
      `SELECT id, provider_id, status FROM letter_sends
        WHERE ref = ANY($1) AND provider_id IS NOT NULL AND sent_at > now() - interval '14 days'
          AND NOT (status = ANY($2)) AND (checked_at IS NULL OR checked_at < now() - interval '2 minutes')
        ORDER BY sent_at DESC LIMIT $3`,
      [refs, ["bounced", "complained", "failed", "clicked"], max],
    );
    await Promise.all(rows.map(async (row) => {
      const status = statusFromEvent(await emailLastEvent(row.provider_id));
      if (status && status !== row.status && !settled(row.status)) {
        await sql("UPDATE letter_sends SET status = $2, status_at = now(), checked_at = now() WHERE id = $1", [row.id, status]);
      } else {
        await sql("UPDATE letter_sends SET checked_at = now() WHERE id = $1", [row.id]);
      }
    }));
  } catch (error) {
    console.warn("letter statuses not refreshed", error?.message);
  }
}

/** { ref → sends, newest first (up to 10 each) } for the given recipients; only one event's sends when `eventId` is given. */
export async function sendsFor(refs, { eventId = null } = {}) {
  if (!refs?.length) return {};
  try {
    const rows = await sql(
      `SELECT * FROM (
         SELECT ref, letter_key, email_to, cc, status, detail, sent_at, status_at,
                row_number() OVER (PARTITION BY ref ORDER BY sent_at DESC) AS n
           FROM letter_sends WHERE ref = ANY($1) AND ($2::uuid IS NULL OR event_id = $2)) s
        WHERE n <= 10 ORDER BY sent_at DESC`,
      [refs, eventId],
    );
    const out = {};
    for (const row of rows) (out[row.ref] ||= []).push(row);
    return out;
  } catch {
    return {};
  }
}
