import { notFound, redirect } from "next/navigation";
import EventsView from "../../components/EventsView";
import { currentSlugFor, loadEvent, loadEventPhotos, manilaToday } from "../../lib/publicEvents";
import { EVENTS_URL } from "../../lib/eventsHost.mjs";
import { SITE_NAME, SITE_URL } from "../../lib/siteSeo.mjs";
import { eventUrl, formatWhen } from "../../lib/share.mjs";

// Rendered on first visit and refreshed hourly, or straight away when an admin saves.
export const revalidate = 3600;

const absolute = (path) => (path?.startsWith("http") ? path : `${EVENTS_URL}${path}`);

function description(event) {
  const where = [event.venue, event.city].filter(Boolean).join(", ");
  const text = `${formatWhen(event)} at ${where}.${event.supports ? ` For ${event.supports}.` : ""} ${event.summary || ""}`;
  return text.replace(/\s+/g, " ").trim().slice(0, 200);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) return { title: `Event not found | ${SITE_NAME}`, robots: { index: false } };
  const title = `${event.title} | ${SITE_NAME}`;
  const image = event.image
    ? { url: absolute(event.image), width: 1600, height: 1000, alt: event.imageAlt || event.title }
    : { url: `${SITE_URL}/house-of-retrievers-hero-poster.jpg`, width: 1280, height: 720, alt: "House of Retrievers furparents and furbabies together" };
  const desc = description(event);
  return {
    title,
    description: desc,
    alternates: { canonical: eventUrl(event.slug) },
    openGraph: { type: "website", url: eventUrl(event.slug), title: event.title, description: desc, siteName: SITE_NAME, locale: "en_PH", images: [image] },
    twitter: { card: "summary_large_image", title: event.title, description: desc, images: [image.url] },
  };
}

/** schema.org Event, so search engines can show the date and place. */
function structuredData(event) {
  const start = event.startTime ? `${event.date}T${event.startTime}:00+08:00` : event.date;
  const end = event.endTime ? `${event.date}T${event.endTime}:00+08:00` : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: start,
    endDate: end,
    eventStatus: event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue,
      address: { "@type": "PostalAddress", addressLocality: event.city, addressCountry: "PH" },
      ...(Number.isFinite(event.venueLat) ? { geo: { "@type": "GeoCoordinates", latitude: event.venueLat, longitude: event.venueLng } } : {}),
    },
    image: event.image ? [absolute(event.image)] : undefined,
    description: event.summary,
    url: eventUrl(event.slug),
    organizer: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export default async function EventPage({ params }) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) {
    // An address the event used before it was renamed: send people on.
    // On the events host the middleware then trims /events/ from the path.
    const current = await currentSlugFor(slug);
    if (current) redirect(`/events/${current}`);
    notFound();
  }
  const past = event.date < manilaToday();
  const photos = past ? await loadEventPhotos(slug) : [];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(event)).replace(/</g, "\\u003c") }} />
      <EventsView upcoming={[]} past={[]} focus={{ event, past, photos }} />
    </>
  );
}
