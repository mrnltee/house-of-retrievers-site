import { SITE_VIDEOS } from "../lib/siteVideos.mjs";
/**
 * @typedef {Object} ActivityPhoto
 * @property {string} src   Path to an image in `public/`.
 * @property {string} alt   Meaningful alternative text.
 */

/**
 * A "what moves us" story shown in the purpose section.
 *
 * @typedef {Object} Activity
 * @property {string} eyebrow                 Small label above the title.
 * @property {string} title                   Story headline.
 * @property {string} copy                    Supporting paragraph.
 * @property {string} image                   Still image, also used as the video poster.
 * @property {string} alt                     Alternative text for the story stage.
 * @property {ActivityPhoto[]} [gallery]      Optional auto-advancing photo carousel.
 * @property {string} [video]                 Optional looping video in `public/`.
 * @property {ActivityAction} action          The pillar's main button.
 * @property {ActivityAction} [secondary]     Optional quieter link beside it.
 * @property {{label: string, text: string}} [proof]  A real activity that shows the pillar ("Last time").
 * @property {string[]} [steps]               Shown instead of `proof`: how giving works, in order.
 */

/**
 * A pillar's call to action. `kind` "join" opens the Join form at `interest`
 * (one of `interests` in `join.js`); "support" opens the Support panel.
 * `track` is the GA4 `cta_name`, so keep it stable once it is live.
 *
 * @typedef {Object} ActivityAction
 * @property {string} label
 * @property {"join" | "support"} kind
 * @property {string} [interest]
 * @property {string} track
 */

/**
 * The facts under the "What moves us" intro. Only facts on the site already:
 * gatherings are the past stops on the journey timeline (`journey.js`, May to
 * Nov 2026, the SEC registration left out); causes are the beneficiaries named
 * there. Update by hand when the timeline grows. (26 Nov 2026)
 *
 * @type {{value: string, label: string}[]}
 */
export const missionFacts = [
  { value: "9", label: "gatherings since our first in May 2026" },
  { value: "2", label: "causes helped: MBY Pet Rescue and Milagros Elderly Home" },
  { value: "SEC", label: "registered since September 2026" },
];

/** @type {Activity[]} */
export const activities = [
  {
    eyebrow: "Community outreach",
    title: "Paws for a purpose",
    copy: "Days when we show up where we’re needed, furbabies in tow, and lend a paw to people who could use one.",
    image: "/1-purpaws/purpaw1.jpg",
    gallery: [
      { src: "/1-purpaws/purpaw1.jpg", alt: "A volunteer kneeling to greet a golden retriever in an orange bandana during a care home visit" },
      { src: "/1-purpaws/purpaw2.jpg", alt: "A golden retriever in a House of Retrievers bandana looking up beside a nurse and a resident" },
      { src: "/1-purpaws/purpaw3.jpg", alt: "A golden retriever in a House of Retrievers bandana resting on the floor as residents watch" },
      { src: "/1-purpaws/purpaw4.jpg", alt: "A resident cupping a golden retriever's face while a volunteer steadies the dog" },
      { src: "/1-purpaws/purpaw5.jpg", alt: "A volunteer in a House of Retrievers shirt crouching beside a golden retriever near the refreshments" },
      { src: "/1-purpaws/purpaw6.jpg", alt: "Volunteers and two golden retrievers gathered with a certificate outside the care home" },
      { src: "/1-purpaws/purpaw7.jpg", alt: "A small child meeting two golden retrievers in bandanas beside the refreshments table" },
      { src: "/1-purpaws/purpaw8.jpg", alt: "A resident in a wheelchair reaching out to the golden retrievers gathered around him" },
      { src: "/1-purpaws/purpaw9.jpg", alt: "A golden retriever in a House of Retrievers bandana lying on the floor between visitors" },
      { src: "/1-purpaws/purpaw10.jpg", alt: "A resident's hand and a volunteer's hand resting together on a golden retriever's head" },
      { src: "/1-purpaws/purpaw11.jpg", alt: "A golden retriever waiting beside a resident's wheelchair as a nurse looks on" },
      { src: "/1-purpaws/purpaw12.jpg", alt: "A child in a House of Retrievers shirt walking a golden retriever through the visit" },
      { src: "/1-purpaws/purpaw13.jpg", alt: "A golden retriever in a blue House of Retrievers bandana being petted during the visit" },
      { src: "/1-purpaws/purpaw14.jpg", alt: "A resident reaching toward a golden retriever that lifts its head to meet her hand" },
      { src: "/1-purpaws/purpaw15.jpg", alt: "A golden retriever leaning in to be petted by a resident while a nurse steadies the wheelchair" },
    ],
    alt: "Paws for a purpose community outreach photo gallery",
    proof: { label: "Last time · August 2026", text: "Five of our dogs visited the residents of Milagros Elderly Home." },
    action: { label: "Volunteer with your dog", kind: "join", interest: "Volunteer", track: "mission_volunteer" },
  },
  {
    eyebrow: "Shared experience",
    title: "Better humans for better dogs",
    copy: "Trips, workshops, and days out where we swap what we’ve learned — and the friendships outlast the day.",
    image: "/2-better/better1.jpg",
    gallery: [
      { src: "/2-better/better1.jpg", alt: "Members and their golden retrievers sharing paddleboards out in the surf" },
      { src: "/2-better/better2.jpg", alt: "Six golden retrievers in bandanas lined up together at the San Juan surf shop" },
      { src: "/2-better/better3.jpg", alt: "A place setting for the embroidery class, marked with a golden retriever place card" },
      { src: "/2-better/better4.jpg", alt: "Members seated along the decorated table as the embroidery class begins" },
      { src: "/2-better/better5.jpg", alt: "The chalkboard sign for the House of Retrievers private embroidery class" },
      { src: "/2-better/better6.jpg", alt: "Two members working through a stitch together at the class table" },
      { src: "/2-better/better7.jpg", alt: "A member threading her embroidery hoop at the decorated table" },
      { src: "/2-better/better8.jpg", alt: "The group gathered for a photo at the end of the embroidery class" },
    ],
    alt: "Better humans for better dogs photo gallery",
    proof: { label: "Last time", text: "An embroidery class with Pawfect Blooms, and a surf day in San Juan with the whole pack." },
    action: { label: "Join the pack", kind: "join", interest: "Member", track: "mission_join" },
  },
  {
    eyebrow: "Activities for a cause",
    title: "Every gathering can give back",
    copy: "The fun kind of fundraising: a day the whole pack looks forward to, for a beneficiary we name up front so everyone sees where it goes.",
    video: SITE_VIDEOS.giveBack,
    image: "/3-giveback/mby-give-back-poster.jpg",
    alt: "Two golden retrievers beside a car boot loaded with donated dog food",
    steps: [
      "We name the beneficiary before the day starts.",
      "The pack turns up and has a good day.",
      "We publish what was turned over, as we did for MBY Pet Rescue after Pawres de Mayo.",
    ],
    action: { label: "Support the pack", kind: "support", track: "mission_support" },
    secondary: { label: "Partner with us", kind: "join", interest: "Partner", track: "mission_partner" },
  },
];
