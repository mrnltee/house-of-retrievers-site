import { hasDatabase, sql } from "./db";
import { EVENTS_URL } from "./eventsHost.mjs";
import { isPublic, publicSupporter } from "./supporters.mjs";

const PUBLIC = `SELECT * FROM supporters
  WHERE status = 'confirmed' AND show_on_site AND logo IS NOT NULL AND coalesce(blurb, '') <> ''`;

/**
 * Supporters the website may show, each with the published events that list
 * them (matched by name in the event's Partners or Sponsors field, newest
 * first). Empty without a database, so the home page simply leaves the
 * section out.
 */
export async function loadPublicSupporters() {
  if (!hasDatabase()) return [];
  try {
    const rows = (await sql(`${PUBLIC} ORDER BY kind DESC, name`)).filter(isPublic);
    if (!rows.length) return [];
    const events = await sql(
      `SELECT slug, title, date, partners, sponsors FROM events
        WHERE status = 'published' AND (cardinality(partners) > 0 OR cardinality(sponsors) > 0)
        ORDER BY date DESC LIMIT 300`,
    );
    return rows.map((row) => {
      const field = row.kind === "Partner" ? "partners" : "sponsors";
      const name = row.name.toLowerCase();
      const backed = events
        .filter((e) => (e[field] || []).some((n) => n.toLowerCase() === name))
        .map((e) => ({ slug: e.slug, title: e.title, date: String(e.date).slice(0, 10), url: `${EVENTS_URL}/${e.slug}` }));
      return publicSupporter(row, backed);
    });
  } catch {
    return [];
  }
}

/** { lowercased name → { slug, logo } } for public supporters among `names`. */
export async function supporterLinks(names) {
  const wanted = [...new Set((names || []).map((n) => String(n).toLowerCase()))];
  if (!hasDatabase() || !wanted.length) return {};
  try {
    const rows = await sql(`${PUBLIC} AND lower(name) = ANY($1)`, [wanted]);
    return Object.fromEntries(rows.filter(isPublic).map((r) => [r.name.toLowerCase(), { slug: r.slug, logo: r.logo }]));
  } catch {
    return {};
  }
}
