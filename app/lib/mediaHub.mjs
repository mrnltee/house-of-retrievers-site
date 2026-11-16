/** @type {{path: string, label: string}[]} */
export const MEDIA_THUMBNAILS = [
  // Photos the home page doesn't lead with, so the hub doesn't look like a copy of the main site.
  { path: "/journey/pawres-de-mayo/2.jpg", label: "Pawres de Mayo — two retrievers in party dresses" },
  { path: "/journey/pawres-de-mayo/3.jpg", label: "Pawres de Mayo — group photo on the lawn" },
  { path: "/journey/international-free-hugs-day/5.jpg", label: "Free Hugs Day — a woman cupping a retriever's face" },
  { path: "/journey/milagros-elderly-shelter/4.jpg", label: "Milagros visit — a resident petting a retriever" },
  { path: "/journey/beagle-buddies-pack-walk/3.jpg", label: "Pack walk — Beagle Buddies PH leading the walk" },
  { path: "/journey/freehugs-bgc/3.jpg", label: "FreeHugs BGC — a boy petting a retriever on a bench" },
  { path: "/1-purpaws/purpaw8.jpg", label: "Care visit — a resident reaching out to the retrievers" },
  { path: "/1-purpaws/purpaw10.jpg", label: "Care visit — hands resting on a retriever's head" },
  { path: "/2-better/better2.jpg", label: "Surf day — six retrievers lined up at the surf shop" },
  { path: "/2-better/better3.jpg", label: "Embroidery class — the retriever place card" },
  { path: "/2-better/better8.jpg", label: "Embroidery class — the group photo" },
  // The home page's own cover images, kept so content saved with them still shows.
  { path: "/house-of-retrievers-hero-poster.jpg", label: "Home page hero — families and furbabies" },
  { path: "/1-purpaws/purpaw1.jpg", label: "Home page — Purpose cover" },
  { path: "/2-better/better1.jpg", label: "Home page — Better cover" },
  { path: "/3-giveback/mby-give-back-poster.jpg", label: "Home page — Give back cover" },
  { path: "/cta-join-us-poster.jpg", label: "Home page — Join cover" },
];

export const DEFAULT_MEDIA_TIMELINE = [
  // Names, places and dates follow the home page's "Our journey" (app/content/journey.js).
  { activity: "Pawres de Mayo", date: "17 May 2026", location: "Parklinks Pet Park, Pasig", purpose: "Beneficiary: MBY Pet Rescue and Sanctuary", thumbnail: "/journey/pawres-de-mayo/2.jpg" },
  { activity: "International Free Hugs Day", date: "July 2026", location: "BGC, Taguig", purpose: "Where Purpose to Care began", thumbnail: "/journey/international-free-hugs-day/5.jpg" },
  { activity: "Basic Embroidery Class", date: "August 2026", location: "Quezon City", purpose: "Purpose to Learn, with Pawfect Blooms", thumbnail: "/2-better/better3.jpg" },
  { activity: "Visit to Milagros Elderly Shelter", date: "August 2026", location: "Milagros Elderly Home Care and Services", purpose: "Community outreach: care and companionship", thumbnail: "/journey/milagros-elderly-shelter/4.jpg" },
  { activity: "Pack walk with Beagle Buddies PH", date: "23 August 2026", location: "Ayala Triangle, Makati", purpose: "Our first collaboration with another dog community", thumbnail: "/journey/beagle-buddies-pack-walk/3.jpg" },
  { activity: "FreeHugs", date: "September 2026, then monthly", location: "BGC, Taguig", purpose: "Held on the last Sunday of each month", thumbnail: "/journey/freehugs-bgc/3.jpg" },
  { activity: "Weekend Social Run", date: "11 October 2026", location: "Filinvest City, Alabang", purpose: "", thumbnail: "" },
  { activity: "Bedazzle Barkdate", date: "17 October 2026", location: "Wiltlover Café, MetLive Mall, Pasay", purpose: "", thumbnail: "" },
  { activity: "Retriever Romp", date: "8 November 2026", location: "Parklinks Pet Park, Pasig", purpose: "A retrievers’ casual meet-up", thumbnail: "" },
];

export const DEFAULT_MEDIA_PROFILE = {
  title: "The details behind the work.",
  intro: "For a quick briefing, here is the information most useful to editors, producers, and potential partners.",
  cards: [
    { value: "09", label: "documented activities", note: "From Pawres de Mayo in May to the Retriever Romp in November 2026." },
    { value: "05", label: "purpose areas", note: "Celebrate, Learn, Give Back, Care, and Connect." },
    { value: "SEC", label: "registered nonprofit", note: "Registered in September 2026, No. 2026090268846-04." },
  ],
  images: [
    { src: "/1-purpaws/purpaw8.jpg", alt: "A resident in a wheelchair reaching out to the golden retrievers gathered around him", caption: "Community, with purpose" },
    { src: "/2-better/better2.jpg", alt: "Six golden retrievers in bandanas lined up together at the San Juan surf shop", caption: "Better humans for better dogs" },
    { src: "/journey/pawres-de-mayo/3.jpg", alt: "Members and their golden retrievers gathered on the lawn for a group photo", caption: "Good dogs. Good people." },
  ],
};

export const TIMELINE_ORIENTATIONS = ["vertical", "horizontal"];

function clean(value, max) { return String(value || "").trim().slice(0, max); }

/** @param {unknown} value @returns {{activity: string, date: string, location: string, purpose: string, thumbnail: string}[]} */
export function cleanMediaTimeline(value) {
  let rows = value;
  if (typeof value === "string") {
    try { rows = JSON.parse(value); } catch { rows = []; }
  }
  if (!Array.isArray(rows)) return [];
  const approved = new Set(MEDIA_THUMBNAILS.map(({ path }) => path));
  return rows.slice(0, 12).map((row) => ({
    activity: clean(row?.activity, 120),
    date: clean(row?.date, 80),
    location: clean(row?.location, 180),
    purpose: clean(row?.purpose, 240),
    thumbnail: approved.has(row?.thumbnail) ? row.thumbnail : "",
  })).filter((row) => row.activity);
}

/** @param {unknown} value @returns {typeof DEFAULT_MEDIA_PROFILE} */
export function cleanMediaProfile(value) {
  const profile = value && typeof value === "object" ? value : {};
  const approved = new Set(MEDIA_THUMBNAILS.map(({ path }) => path));
  const cards = Array.isArray(profile.cards) ? profile.cards.slice(0, 3).map((card) => ({
    value: clean(card?.value, 12),
    label: clean(card?.label, 80),
    note: clean(card?.note, 220),
  })) : [];
  const images = Array.isArray(profile.images) ? profile.images.slice(0, 3).map((image) => ({
    src: approved.has(image?.src) ? image.src : "",
    alt: clean(image?.alt, 180),
    caption: clean(image?.caption, 100),
  })) : [];
  return {
    title: clean(profile.title || DEFAULT_MEDIA_PROFILE.title, 180),
    intro: clean(profile.intro || DEFAULT_MEDIA_PROFILE.intro, 320),
    cards: cards.length ? cards : DEFAULT_MEDIA_PROFILE.cards,
    images: images.length ? images : DEFAULT_MEDIA_PROFILE.images,
  };
}

/** @param {unknown} value @returns {"vertical"|"horizontal"} */
export function cleanTimelineOrientation(value) {
  return TIMELINE_ORIENTATIONS.includes(value) ? value : "vertical";
}
