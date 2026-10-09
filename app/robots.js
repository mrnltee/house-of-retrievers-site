import { SITE_URL } from "./lib/siteSeo.mjs";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // RSVP confirmation passes are private links. The admin is noindex everywhere.
      disallow: ["/api/", "/admin", "/r/", "/events/r/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
