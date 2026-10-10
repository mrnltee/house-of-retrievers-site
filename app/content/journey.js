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
 * Photos: put them in `public/journey/<id>/` (1.jpg, 2.jpg, …) and list them
 * in `photos`, in the order they happened. Longest side about 1000 px, JPEG
 * around quality 76 (roughly 100 KB each); landscape suits the card best, and
 * six per stop is plenty, since every photo adds page weight. One
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
 * @property {string} [month]   "YYYY-MM". Leave out while the date is not set: the stop
 *                              shows "Soon" and counts as upcoming. Keep undated stops last.
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
    photos: [
      { src: "/journey/pawres-de-mayo/1.jpg", alt: "A host on stage with a baby in a carrier and a golden retriever in a cream dress" },
      { src: "/journey/pawres-de-mayo/2.jpg", alt: "Two golden retrievers in party dresses grinning at the camera" },
      { src: "/journey/pawres-de-mayo/3.jpg", alt: "Members and their golden retrievers gathered on the lawn for a group photo" },
      { src: "/journey/pawres-de-mayo/4.jpg", alt: "Two members lifting their golden retrievers up in front of the Parklinks fence" },
      { src: "/journey/pawres-de-mayo/5.jpg", alt: "The pack lined up under the tents with their dogs in costume" },
      { src: "/journey/pawres-de-mayo/6.jpg", alt: "A member kneeling with his golden retriever in a gown, holding up a certificate" },
    ],
  },
  {
    id: "international-free-hugs-day",
    month: "2026-07",
    title: "International Free Hugs Day",
    place: "BGC, Taguig",
    story: "Our first free hugs event with the furbabies front and center. Purpose to Care began here.",
    tag: "Purpose to Care",
    photos: [
      { src: "/journey/international-free-hugs-day/1.jpg", alt: "Members and their golden retrievers sitting in a circle on the lawn at BGC with Free Hugs signs" },
      { src: "/journey/international-free-hugs-day/2.jpg", alt: "Visitors photographing the circle of golden retrievers on the grass" },
      { src: "/journey/international-free-hugs-day/3.jpg", alt: "A golden retriever in a blue dress and bandana resting on the grass beside its owner" },
      { src: "/journey/international-free-hugs-day/4.jpg", alt: "Members and their golden retrievers gathered on the lawn in the late afternoon" },
      { src: "/journey/international-free-hugs-day/5.jpg", alt: "A woman cupping a smiling golden retriever's face in her hands" },
    ],
  },
  {
    id: "basic-embroidery-class",
    month: "2026-08",
    title: "Basic Embroidery Class",
    place: "QC",
    story: "An afternoon embroidery class with our partner Pawfect Blooms, and the start of Purpose to Learn.",
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
    id: "milagros-elderly-shelter",
    month: "2026-08",
    title: "Visit to Milagros Elderly Shelter",
    story: "A week after the embroidery class, we visited the residents of Milagros Elderly Shelter.",
    tag: "Community outreach",
    photos: [
      { src: "/journey/milagros-elderly-shelter/1.jpg", alt: "House of Retrievers receiving a certificate of appreciation under the Milagros welcome screen" },
      { src: "/journey/milagros-elderly-shelter/2.jpg", alt: "Staff, members and golden retrievers together for a group photo at Milagros" },
      { src: "/journey/milagros-elderly-shelter/3.jpg", alt: "Golden retrievers in red bandanas greeting residents seated in wheelchairs" },
      { src: "/journey/milagros-elderly-shelter/4.jpg", alt: "A resident in a wheelchair reaching down to pet a golden retriever" },
      { src: "/journey/milagros-elderly-shelter/5.jpg", alt: "A caregiver kneeling beside a resident as a golden retriever rests its head on his lap" },
      { src: "/journey/milagros-elderly-shelter/6.jpg", alt: "Several hands petting a golden retriever in a blue bandana" },
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
    photos: [
      { src: "/journey/beagle-buddies-pack-walk/1.jpg", alt: "Walkers and their dogs filling the road at Ayala Avenue" },
      { src: "/journey/beagle-buddies-pack-walk/2.jpg", alt: "A golden retriever in a sequined bandana walking beside its owner" },
      { src: "/journey/beagle-buddies-pack-walk/3.jpg", alt: "Beagles and their owners in matching shirts leading part of the walk" },
      { src: "/journey/beagle-buddies-pack-walk/4.jpg", alt: "A golden retriever in a pink cap walking ahead of the House of Retrievers banner" },
      { src: "/journey/beagle-buddies-pack-walk/5.jpg", alt: "Walkers carrying the Beagle Buddies PH flag with beagles on leash" },
      { src: "/journey/beagle-buddies-pack-walk/6.jpg", alt: "Beagles and their owners meeting on the sidewalk after the walk" },
    ],
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
    photos: [
      { src: "/journey/freehugs-bgc/1.jpg", alt: "Two visitors crouching on the grass to hug a golden retriever" },
      { src: "/journey/freehugs-bgc/2.jpg", alt: "A woman in pink kneeling to greet a golden retriever and two small white dogs" },
      { src: "/journey/freehugs-bgc/3.jpg", alt: "A golden retriever with a Free Hugs sign resting on a bench as a boy pets it" },
      { src: "/journey/freehugs-bgc/4.jpg", alt: "A golden retriever lying on the grass with its eyes half closed" },
      { src: "/journey/freehugs-bgc/5.jpg", alt: "A child reaching out to a happy golden retriever" },
      { src: "/journey/freehugs-bgc/6.jpg", alt: "A visitor kneeling beside a golden retriever wearing a Free Hugs sign" },
    ],
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
    place: "Parklinks Pet Park, Pasig",
  },
  {
    id: "a-golden-beginning",
    title: "A Golden Beginning: Paws & Purpose",
    story: "Details to be announced soon.",
  },
];
