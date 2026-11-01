import { hasDatabase, sql } from "./db";
import { EVENTS_URL } from "./eventsHost.mjs";
import { isPublic, publicSupporter } from "./supporters.mjs";

// Switched on, with a logo and a blurb; whether they said Yes to an event is checked with the trackers.
const SHOWABLE = `SELECT * FROM supporters WHERE show_on_site AND logo IS NOT NULL AND coalesce(blurb, '') <> ''`;
// Yes replies on published events, newest event first (the Brand trackers, owner 2026-11-01).
const YES = `SELECT eb.supporter_id, eb.role, eb.cash_amount, eb.in_kind_value, eb.show_amounts, e.slug, e.title, e.date
  FROM event_brands eb JOIN events e ON e.id = eb.event_id
  WHERE eb.reply = 'yes' AND e.status = 'published'`;

/**
 * Brands the website may show, each with the published events they said Yes
 * to (newest first). A brand shows as its role at its latest Yes event. Its
 * amounts are the ones ticked "OK to show" for the latest year that has any.
 * Empty without a database, so the home page simply leaves the section out.
 */
export async function loadPublicSupporters() {
  if (!hasDatabase()) return [];
  try {
    const [rows, yes] = await Promise.all([sql(`${SHOWABLE} ORDER BY name`), sql(`${YES} ORDER BY e.date DESC`)]);
    const bySupporter = {};
    for (const y of yes) (bySupporter[y.supporter_id] ||= []).push(y);
    return rows
      .filter((row) => isPublic(row, { joined: bySupporter[row.id]?.length || 0 }))
      .map((row) => {
        const mine = bySupporter[row.id];
        const events = mine.map((e) => ({ slug: e.slug, title: e.title, date: String(e.date).slice(0, 10), url: `${EVENTS_URL}/${e.slug}` }));
        const shown = mine.filter((e) => e.show_amounts && (e.cash_amount || e.in_kind_value));
        const year = shown.length ? Number(String(shown[0].date).slice(0, 4)) : null;
        const ofYear = shown.filter((e) => Number(String(e.date).slice(0, 4)) === year);
        const sum = (key) => ofYear.reduce((n, e) => n + (e[key] || 0), 0) || null;
        return { ...publicSupporter({ ...row, kind: mine[0].role }, events), year, cash: year ? sum("cash_amount") : null, inKind: year ? sum("in_kind_value") : null };
      })
      .sort((a, b) => b.kind.localeCompare(a.kind) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** { lowercased name → { slug, logo } } for public brands among `names`. */
export async function supporterLinks(names) {
  const wanted = [...new Set((names || []).map((n) => String(n).toLowerCase()))];
  if (!hasDatabase() || !wanted.length) return {};
  try {
    const rows = await sql(
      `${SHOWABLE} AND lower(name) = ANY($1) AND id IN (SELECT supporter_id FROM (${YES}) y)`,
      [wanted],
    );
    return Object.fromEntries(rows.filter((r) => isPublic(r, { joined: 1 })).map((r) => [r.name.toLowerCase(), { slug: r.slug, logo: r.logo }]));
  } catch {
    return {};
  }
}
