import EventsView from "../components/EventsView";
import { events as contentEvents } from "../content/events";
import { hasDatabase, sql } from "../lib/db";
import { toPublicEvent } from "../lib/admin/events.mjs";
import { EVENTS_URL } from "../lib/eventsHost.mjs";
import { SITE_NAME } from "../lib/siteSeo.mjs";

// Re-sort upcoming and past at least hourly, so a finished event moves to
// "Where we have been" without a redeploy.
export const revalidate = 3600;

const TITLE = `Events | ${SITE_NAME}`;
const DESCRIPTION =
  "Runs, workshops, care visits and fundraisers with House of Retrievers PH: where we will be next and how to come along.";
const SHARE_IMAGE = {
  url: "/house-of-retrievers-hero-poster.jpg",
  width: 1280,
  height: 720,
  alt: "House of Retrievers furparents and furbabies together",
};

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${EVENTS_URL}/` },
  openGraph: {
    type: "website",
    url: `${EVENTS_URL}/`,
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_PH",
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SHARE_IMAGE.url],
  },
};

function manilaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

/**
 * Published events from the admin once its database is connected; until then,
 * the hand-edited list in app/content/events.js.
 */
async function loadEvents() {
  if (!hasDatabase()) return contentEvents;
  try {
    const rows = await sql(
      `SELECT e.*, (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND r.status = 'confirmed') AS confirmed
       FROM events e WHERE e.status IN ('published', 'cancelled') ORDER BY e.date`,
    );
    return rows.map((row) => toPublicEvent(row, row.confirmed));
  } catch {
    return contentEvents;
  }
}

export default async function EventsPage() {
  const events = await loadEvents();
  const today = manilaToday();
  const byDate = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = byDate.filter((event) => event.date >= today);
  const past = byDate.filter((event) => event.date < today).reverse();

  return <EventsView upcoming={upcoming} past={past} />;
}
