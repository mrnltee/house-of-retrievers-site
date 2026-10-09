import { sql } from "../db";

/**
 * Optional alert emails through Resend (phase 2 sets RESEND_API_KEY and
 * ADMIN_ALERT_FROM, e.g. "HOR Admin <admin@houseofretrieversph.org>").
 * Until then this does nothing; the activity log and dashboard still show
 * every change.
 */
export async function alertAdmins(subject, lines) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_ALERT_FROM;
  if (!key || !from) return false;
  const rows = await sql("SELECT email FROM admins WHERE active AND (roles && '{owner,treasurer}')");
  if (!rows.length) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: rows.map((r) => r.email), subject, text: lines.join("\n") }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
