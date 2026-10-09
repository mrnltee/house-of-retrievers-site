import { HOME_URL } from "./lib/siteSeo.mjs";
import { EVENTS_URL } from "./lib/eventsHost.mjs";
import { loadEvents } from "./lib/publicEvents";
import { eventUrl } from "./lib/share.mjs";

export const revalidate = 3600;

export default async function sitemap() {
  const events = (await loadEvents()).filter((event) => event.status !== "cancelled");
  return [
    {
      url: HOME_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${EVENTS_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...events.map((event) => ({ url: eventUrl(event.slug), changeFrequency: "weekly", priority: 0.6 })),
  ];
}
