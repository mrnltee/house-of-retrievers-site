/**
 * The media hub's launch overview (owner, 18 Nov 2026): the Golden Beginning card shows the event at a glance,
 * read from the live event (date, venue, beneficiaries, speakers and special guests, partners and sponsors) so
 * the press kit follows what HoR sets in the admin. Only public fields; the event page already shows them.
 */
export const LAUNCH_SLUG = "golden-beginning-paws-and-purpose-2026-11";
/** The public programme time (owner, 16 Nov 2026): 2:30 PM is the crew call and registration, never published. */
export const LAUNCH_TIME = "3:00–6:00 PM";

const FALLBACK = {
  date: "2026-11-30",
  venue: "Novotel Manila Araneta City",
  place: "Quezon City",
  beneficiaries: ["Pawssion Project Foundation Inc.", "Little Sisters of the Abandoned Elderly – Sta. Teresa Jornet Home"],
};

function longDate(iso) {
  const d = new Date(`${iso}T00:00:00+08:00`);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Manila" }).format(d);
}

/**
 * Partners and sponsors with their logo (owner, 18 Nov 2026): a brand with a public record (switched on, logo
 * and blurb) has its logo and a link to its panel on the main site; the rest show an initial, like the event page.
 */
function brands(names = [], links = {}) {
  return (names || []).map((name) => {
    const link = links?.[String(name).toLowerCase()];
    return { name, logo: link?.logo || null, slug: link?.slug || null };
  });
}

/** The overview rows and lists for the card, from a public event (or the built-in facts when it can't be read). */
export function launchOverview(event) {
  const e = event || {};
  const date = longDate(e.date || FALLBACK.date);
  const venue = e.venue || FALLBACK.venue;
  const place = e.venueAddress || [e.city].filter(Boolean).join(", ") || FALLBACK.place;
  const beneficiaries = (e.beneficiaries || []).map((b) => b.name).filter(Boolean);
  const supports = beneficiaries.length ? beneficiaries : event ? (e.supports ? [e.supports] : []) : FALLBACK.beneficiaries;
  const guests = (e.speakers || []).map((s) => ({ id: s.id, name: s.name, role: s.role, label: s.label || null, photo: s.photo || null }));
  return {
    facts: [
      ["When", `${date} · ${LAUNCH_TIME}`],
      ["Where", place && place !== venue ? `${venue}, ${place}` : venue],
      ...(supports.length ? [["For", supports.join(" and ")]] : []),
    ],
    guests,
    partners: brands(e.partners, e.supporterLinks),
    sponsors: brands(e.sponsors, e.supporterLinks),
  };
}

export const initialsOf = (name) => String(name || "").trim().split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "•";
