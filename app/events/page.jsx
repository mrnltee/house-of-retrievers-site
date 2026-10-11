import EventsView from "../components/EventsView";
import { loadEvents } from "../lib/publicEvents";
import { hasEnded } from "../lib/eventTime.mjs";
import { EVENTS_URL } from "../lib/eventsHost.mjs";
import { SITE_NAME } from "../lib/siteSeo.mjs";

// Re-sort every five minutes, so an event moves to "Where we have been"
// shortly after it ends, without a redeploy.
export const revalidate = 300;

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

export default async function EventsPage() {
  const events = await loadEvents();
  const now = Date.now();
  const byDate = [...events].sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "").localeCompare(b.startTime || ""));
  const upcoming = byDate.filter((event) => !hasEnded(event, now));
  const past = byDate.filter((event) => hasEnded(event, now)).reverse();

  return <EventsView upcoming={upcoming} past={past} />;
}
