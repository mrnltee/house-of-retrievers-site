import { HOME_URL } from "./lib/siteSeo.mjs";

export default function sitemap() {
  return [
    {
      url: HOME_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
