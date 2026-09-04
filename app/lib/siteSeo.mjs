export const SITE_URL = "https://www.houseofretrieversph.org";
export const HOME_URL = SITE_URL;
export const SITE_NAME = "House of Retrievers PH";
export const SITE_TITLE = "House of Retrievers PH | Paws for a Purpose";
export const SITE_DESCRIPTION =
  "House of Retrievers PH brings responsible furparents and furbabies together to support animal rescues, serve communities, and create meaningful memories.";

export const SOCIAL_PROFILES = [
  "https://www.facebook.com/houseofretrieversph",
  "https://www.instagram.com/houseofretrieversph/",
];

export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${HOME_URL}#website`,
      url: HOME_URL,
      name: SITE_NAME,
      alternateName: ["House of Retrievers", "HOR"],
      inLanguage: "en-PH",
      publisher: { "@id": `${HOME_URL}#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${HOME_URL}#organization`,
      name: SITE_NAME,
      alternateName: "HOR",
      url: HOME_URL,
      description: SITE_DESCRIPTION,
      logo: {
        "@type": "ImageObject",
        "@id": `${HOME_URL}#logo`,
        url: `${SITE_URL}/icon.png`,
        contentUrl: `${SITE_URL}/icon.png`,
        width: 512,
        height: 512,
      },
      areaServed: {
        "@type": "Country",
        name: "Philippines",
      },
      sameAs: SOCIAL_PROFILES,
    },
  ],
};
