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
 */

/** @type {Activity[]} */
export const activities = [
  {
    eyebrow: "Community outreach",
    title: "Paws for a purpose",
    copy: "Volunteer-led activities where retriever families show up, lend a paw, and help communities that need support.",
    image: "/1-purpaws/purpaws1.jpg",
    gallery: [
      { src: "/1-purpaws/purpaws1.jpg", alt: "Golden retriever greeting people during a community outreach visit" },
      { src: "/1-purpaws/purpaws2.jpg", alt: "Golden retriever receiving affection during a community outreach visit" },
      { src: "/1-purpaws/purpaws3.jpg", alt: "Golden retriever connecting with participants during a community outreach visit" },
    ],
    alt: "Paws for a purpose community outreach photo gallery",
  },
  {
    eyebrow: "Responsible ownership",
    title: "Better humans for better dogs",
    copy: "Practical learning, shared experience, and a supportive circle for raising healthy, well-socialized retrievers.",
    image:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=85",
    alt: "Golden retriever looking toward the camera",
  },
  {
    eyebrow: "Activities for a cause",
    title: "Every gathering can give back",
    copy: "Joyful pack activities designed to rally support, with proceeds intended for a clearly named beneficiary.",
    video: "/3-giveback/mby-give-back.mp4",
    image: "/3-giveback/mby-give-back-poster.jpg",
    alt: "Two golden retrievers beside a car boot loaded with donated dog food",
  },
];
