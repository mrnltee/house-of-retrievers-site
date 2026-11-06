import { TICKET_COUNTS_COLUMN } from "./ticketCounts.mjs";
import { photographersForEvent } from "./photographersStore";
import { events as contentEvents } from "../content/events";
import { hasDatabase, sql } from "./db";
import { toPublicEvent } from "./admin/events.mjs";
import { withPoster } from "./posterFrame.mjs";
import { cloudinaryConfig, photoUrl } from "./cloudinary.mjs";
import { supporterLinks } from "./publicSupporters";
import { beneficiariesForEvent } from "./publicBeneficiaries";
import { yesBrandsByEvent } from "./eventBrandsStore";
import { publicNames, withoutBrands } from "./eventBrands.mjs";
import { CAPACITY_USED_SQL, PUBLIC_HUMANS_USED_SQL } from "./eventCapacity.mjs";

export function manilaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

const PUBLIC_EVENTS = `SELECT e.*, (SELECT ${CAPACITY_USED_SQL} FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed' AND r.deleted_at IS NULL AND (r.fee_status <> 'waiting' OR r.hold_expires_at IS NULL OR r.hold_expires_at > now())) AS confirmed,
  (SELECT ${PUBLIC_HUMANS_USED_SQL} FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed' AND r.deleted_at IS NULL AND (r.fee_status <> 'waiting' OR r.hold_expires_at IS NULL OR r.hold_expires_at > now())) AS humans_used,
  ${TICKET_COUNTS_COLUMN}
  FROM events e WHERE e.status IN ('published', 'cancelled')`;

/**
 * An event's partners and sponsors as the site shows them: brands that said Yes
 * on its Brand tracker, then names typed into the event that aren't directory
 * brands. If the trackers can't be read, no names show (a brand that said No must never appear).
 */
async function withBrands(rows) {
  if (!rows.length) return rows;
  try {
    const [yes, directory] = await Promise.all([yesBrandsByEvent(rows.map((r) => r.id)), sql("SELECT name FROM supporters")]);
    const names = directory.map((d) => d.name.toLowerCase());
    const of = (id, role) => (yes[id] || []).filter((b) => b.role === role).map((b) => b.name);
    return rows.map((r) => ({ ...r, partners: publicNames(r.partners || [], of(r.id, "Partner"), names), sponsors: publicNames(r.sponsors || [], of(r.id, "Sponsor"), names) }));
  } catch {
    return rows.map(withoutBrands);
  }
}

/**
 * Published events from the admin once its database is connected; until then,
 * the hand-edited list in app/content/events.js.
 */
export async function loadEvents() {
  if (!hasDatabase()) return contentEvents;
  try {
    const rows = await withBrands(await sql(`${PUBLIC_EVENTS} ORDER BY e.date`));
    // Every cover is shown at 4:5 (owner, 2026-10-30), even one saved before posters were 4:5.
    return rows.map((row) => withPoster(toPublicEvent(row, row.confirmed), row));
  } catch {
    return contentEvents;
  }
}

/** One public event by its slug, or null. */
export async function loadEvent(slug) {
  if (!/^[a-z0-9-]{1,120}$/.test(String(slug || ""))) return null;
  if (!hasDatabase()) return contentEvents.find((event) => event.slug === slug) || null;
  try {
    const [row] = await withBrands(await sql(`${PUBLIC_EVENTS} AND e.slug = $1`, [slug]));
    if (!row) return null;
    const event = withPoster(toPublicEvent(row, row.confirmed), row);
    // Partners and sponsors with a public record get their logo and a link.
    const links = await supporterLinks([...(event.partners || []), ...(event.sponsors || [])]);
    if (Object.keys(links).length) event.supporterLinks = links;
    // "Photos by": the photographers credited on it (shown once the event has passed).
    const photographers = await photographersForEvent(row.id).catch(() => []);
    if (photographers.length) event.photographers = photographers;
    // Where your support goes: the beneficiaries this charity event picked.
    if (row.is_charity) {
      const beneficiaries = await beneficiariesForEvent(row.id);
      if (beneficiaries.length) event.beneficiaries = beneficiaries;
    }
    return event;
  } catch {
    return null;
  }
}

/** The current slug for an event's old web address, or null. */
export async function currentSlugFor(oldSlug) {
  if (!hasDatabase() || !/^[a-z0-9-]{1,120}$/.test(String(oldSlug || ""))) return null;
  try {
    const [row] = await sql(
      "SELECT e.slug FROM event_slug_redirects r JOIN events e ON e.id = r.event_id WHERE r.old_slug = $1 AND e.status <> 'draft'",
      [oldSlug],
    );
    return row?.slug || null;
  } catch {
    return null;
  }
}

/**
 * An event's approved album photos, sized for the grid and for full screen.
 * For a repeating event (same series_id) this is every published date's photos,
 * newest date first, each tagged with its date and slug so the album can group
 * them by month and link to that date. A one-off event gets only its own.
 */
export async function loadEventPhotos(slug) {
  const config = cloudinaryConfig();
  if (!config || !hasDatabase() || !/^[a-z0-9-]{1,120}$/.test(String(slug || ""))) return [];
  try {
    const rows = await sql(
      `SELECT p.public_id, p.alt, p.width, p.height, e.date, e.slug, e.id = me.id AS own
         FROM events me
         JOIN events e ON e.id = me.id OR (me.series_id IS NOT NULL AND e.series_id = me.series_id AND e.status = 'published')
         JOIN event_photos p ON p.event_id = e.id
        WHERE me.slug = $1 AND p.status = 'approved'
        ORDER BY e.date DESC, p.position, p.created_at`,
      [slug],
    );
    return rows.map((row) => ({
      thumb: photoUrl(config.cloudName, row.public_id, 640),
      full: photoUrl(config.cloudName, row.public_id, 1800),
      alt: row.alt || "",
      width: row.width,
      height: row.height,
      date: row.date,
      slug: row.slug,
      own: Boolean(row.own),
    }));
  } catch {
    return [];
  }
}
