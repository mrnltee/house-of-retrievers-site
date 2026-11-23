/**
 * One Save for a tracker (owner, 23 Nov 2026): the Brand and Guest trackers stage row changes in the browser
 * and send them as one JSON list. `readTrackerChanges` keeps only well-formed ones: a row id, a field the
 * tracker knows, and a value that field accepts; a later change to the same row and field wins.
 */
export const MAX_TRACKER_CHANGES = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @param {string} text @param {Record<string, (value: string) => boolean>} fields */
export function readTrackerChanges(text, fields) {
  let list;
  try { list = JSON.parse(String(text || "[]")); } catch { return []; }
  if (!Array.isArray(list)) return [];
  const byKey = new Map();
  for (const c of list) {
    if (!c || typeof c !== "object") continue;
    const row = String(c.row || "");
    const field = String(c.field || "");
    const to = String(c.to ?? "");
    if (!UUID.test(row) || !Object.hasOwn(fields, field) || !fields[field](to)) continue;
    byKey.delete(`${row}|${field}`);
    byKey.set(`${row}|${field}`, { row, field, to });
  }
  return [...byKey.values()].slice(0, MAX_TRACKER_CHANGES);
}

/** The message after a save: what was saved, then anything that couldn't be. */
export function savedMessage(done, problems) {
  const saved = done.length ? `Saved ${done.length} ${done.length === 1 ? "change" : "changes"}: ${done.join(" ")}` : "";
  const failed = problems.length ? `${problems.length === 1 ? "One change wasn't" : `${problems.length} changes weren't`} saved: ${problems.join(" ")}` : "";
  return [saved, failed].filter(Boolean).join(" ");
}
