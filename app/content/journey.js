/**
 * "Our journey" timeline on the main page (app/components/Journey.jsx).
 *
 * Wrap words in **double asterisks** to bold them. `[ as {org}]` is a
 * hidden-until-launch fragment: `{org}` becomes the society's registered
 * name, which /api/legal releases only from launch (see FooterLegal.jsx).
 * Until then the whole [bracketed] part is left out, so the name never sits
 * in the page code before the unveiling.
 *
 * @typedef {Object} JourneyStop
 * @property {string} when        Label above the entry, e.g. "May 2026".
 * @property {string} title       First line; **bold** allowed.
 * @property {string} [note]      Second line; **bold** allowed.
 * @property {boolean} [highlight] Gold marker for a milestone "first".
 * @property {boolean} [upcoming]  Not happened yet: muted marker and text.
 */

/** @type {JourneyStop[]} */
export const journey = [
  {
    when: "May 2026",
    title: "**Pawres de Mayo** at Parklinks Pet Park.",
    note: "Our first Purpose to Celebrate, benefiting MBY Pet Rescue.",
    highlight: true,
  },
  {
    when: "July",
    title: "**International Free Hugs Day** Event at BGC",
    note: "First ever free hugs event with furbabies as the main participant. Purpose to Care begins.",
  },
  {
    when: "August",
    title: "**Basic Embroidery Class** with Pawfect Blooms.",
    note: "Purpose to Learn begins.",
  },
  {
    when: "August",
    title: "**HoR × Beagle Buddies PH pack walk**, Ayala Triangle.",
    note: "Our first inter-community collaboration.",
    highlight: true,
  },
  {
    when: "September",
    title: "**Registered** with the **SEC**[ as {org}].",
    note: "**FreeHugs** at BGC",
  },
  {
    when: "October 2026",
    title: "Upcoming: Weekend Social Run at Filinvest City, Alabang",
    note: "Bedazzle Barkdate at Wiltlover Cafe, Pasay City.",
    upcoming: true,
  },
  {
    when: "November 2026",
    title: "Retriever Romp at Parklinks Pet Park, Pasig",
    upcoming: true,
  },
];
