/** @type {{path: string, label: string}[]} */
export const MEDIA_THUMBNAILS = [
  { path: "/house-of-retrievers-hero-poster.jpg", label: "Hero — families and furbabies" },
  { path: "/1-purpaws/purpaw1.jpg", label: "Purpose — community moment" },
  { path: "/2-better/better1.jpg", label: "Better — retriever family" },
  { path: "/3-giveback/mby-give-back-poster.jpg", label: "Give back — rescue work" },
  { path: "/cta-join-us-poster.jpg", label: "Join — community invitation" },
];

export const DEFAULT_MEDIA_TIMELINE = [
  { activity: "Pawres de Mayo", date: "17 May 2026", location: "Parklinks Pet Park", purpose: "Beneficiary: MBY Pet Rescue and Sanctuary", thumbnail: "/1-purpaws/purpaw1.jpg" },
  { activity: "Purpose to Care visit", date: "Documented activity", location: "Milagros Elderly Home Care and Services", purpose: "A visit shaped around care and companionship", thumbnail: "/2-better/better1.jpg" },
  { activity: "Community Pack Walk", date: "23 August 2026", location: "Ayala Triangle, Makati", purpose: "HoR × Beagle Buddies PH", thumbnail: "/house-of-retrievers-hero-poster.jpg" },
];

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

/** @param {unknown} value @returns {"vertical"|"horizontal"} */
export function cleanTimelineOrientation(value) {
  return TIMELINE_ORIENTATIONS.includes(value) ? value : "vertical";
}
