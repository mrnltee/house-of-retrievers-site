import { HOME_URL } from "./lib/siteSeo.mjs";
import { EVENTS_URL } from "./lib/eventsHost.mjs";

export default function sitemap() {
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
  ];
}
