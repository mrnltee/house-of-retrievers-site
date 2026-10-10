/**
 * "Our journey" timeline on the main page (app/components/Journey.jsx).
 *
 * One entry per event, oldest first. Past and upcoming are worked out from
 * `month` against today in Manila: earlier months are always past, later
 * months always upcoming. Within the current month an entry is past unless
 * it says `upcoming: true`.
 *
 * Linking: add the event in the admin (past events are fine; the events
 * site files them under "Where we have been"), then copy its slug into
 * `event` here.
 *
 * Photos: put them in `public/journey/<id>/` (1.jpg, 2.jpg, …, longest side
 * about 1200 px) and list them in `photos`, in the order they happened. One
 * photo shows still; two or more fade and pan into each other. With no
 * photos the card shows a designed placeholder, so an entry can go live
 * before its pictures are chosen. `alt` says what is actually in the frame.
 *
 * `[ as {org}]` (in `story`) is the society's registered name, released by
 * /api/legal only from launch (see app/lib/useLegal.js). Until then the whole
 * bracketed part is left out, so the name is not in the page early.
 *
 * @typedef {Object} JourneyPhoto
 * @property {string} src  Path under public/, e.g. "/journey/pawres-de-mayo/1.jpg".
 * @property {string} alt  What is in the frame.
 *
 * @typedef {Object} JourneyStop
 * @property {string} id        Unique, URL-safe. Also the photo folder name.
 * @property {string} month     "YYYY-MM".
 * @property {string} title     The event, as people know it.
 * @property {string} [theme]   The event's own theme or subtitle, shown in italics under the title.
 * @property {string} [place]   Venue and city.
 * @property {string} [story]   One plain sentence: what happened, or why it matters.
 * @property {string} [tag]     Small label: the Purpose it began, or "Milestone".
 * @property {"first" | "milestone"} [mark] Gold marker for a first or a milestone.
 * @property {boolean} [upcoming] Only needed for an event later in the current month.
 * @property {string} [event]   The event's slug on events.houseofretrieversph.org. Once set, the
 *                              whole card links to that event page (and its photos, once the
 *                              admin gallery exists). Leave it out until the page is published:
 *                              a card without it is not a link, so nothing points at a missing page.
 * @property {JourneyPhoto[]} [photos]
 */

/** @type {JourneyStop[]} */
export const journey = [
  {
    id: "pawres-de-mayo",
    month: "2026-05",
    title: "Pawres de Mayo",
    place: "Parklinks Pet Park, Pasig",
    story: "Our first Purpose to Celebrate: a day at the park for the benefit of MBY Pet Rescue.",
    tag: "Purpose to Celebrate",
    mark: "first",
  },
  {
    id: "international-free-hugs-day",
    month: "2026-07",
    title: "International Free Hugs Day",
    place: "BGC, Taguig",
    story: "Our first free hugs event with the furbabies front and center. Purpose to Care began here.",
    tag: "Purpose to Care",
  },
  {
    id: "basic-embroidery-class",
    month: "2026-08",
    title: "Basic Embroidery Class",
    story: "A hands-on embroidery class with Pawfect Blooms, and the start of Purpose to Learn.",
    tag: "Purpose to Learn",
    photos: [
      { src: "/2-better/better5.jpg", alt: "The chalkboard sign for the House of Retrievers private embroidery class" },
      { src: "/2-better/better3.jpg", alt: "A place setting for the embroidery class, marked with a golden retriever place card" },
      { src: "/2-better/better4.jpg", alt: "Members seated along the decorated table as the embroidery class begins" },
      { src: "/2-better/better6.jpg", alt: "Two members working through a stitch together at the class table" },
      { src: "/2-better/better7.jpg", alt: "A member threading her embroidery hoop at the decorated table" },
      { src: "/2-better/better8.jpg", alt: "The group gathered for a photo at the end of the embroidery class" },
    ],
  },
  {
    id: "beagle-buddies-pack-walk",
    month: "2026-08",
    title: "Pack walk with Beagle Buddies PH",
    place: "Ayala Triangle, Makati",
    story: "Two dog communities, one walk: our first collaboration with another group.",
    tag: "First collaboration",
    mark: "first",
  },
  {
    id: "sec-registration",
    month: "2026-09",
    title: "Registered with the SEC",
    story: "We’re now officially registered[ as {org}]",
    tag: "Milestone",
    mark: "milestone",
  },
  {
    id: "freehugs-bgc",
    month: "2026-09",
    title: "FreeHugs",
    place: "BGC, Taguig",
    story: "Back at BGC for another round of free hugs.",
    tag: "Purpose to Care",
  },
  {
    id: "weekend-social-run",
    month: "2026-10",
    title: "Weekend Social Run",
    place: "Filinvest City, Alabang",
    upcoming: true,
  },
  {
    id: "bedazzle-barkdate",
    month: "2026-10",
    title: "Bedazzle Barkdate",
    place: "Wiltlover Cafe, Pasay City",
    upcoming: true,
  },
  {
    id: "retriever-romp",
    month: "2026-11",
    title: "Retriever Romp",
    theme: "A Golden Beginning: Paws & Purpose",
    place: "Parklinks Pet Park, Pasig",
  },
];
