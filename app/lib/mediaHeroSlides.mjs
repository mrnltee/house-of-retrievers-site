/**
 * Background photos for the media hub's hero slideshow (owner, 26 Nov 2026).
 *
 * The first is the hero's original poster, which is also the CSS background
 * shown before the slideshow loads, without JavaScript and under reduced
 * motion, so the hand-off is invisible. The rest are wide, open scenes, one per
 * activity, so the slideshow reads as the range of HoR's work. `position` keeps
 * the people on the right, clear of the headline on the left.
 */
export const HERO_SLIDE_MS = 6000;

export const MEDIA_HERO_SLIDES = [
  { src: "/house-of-retrievers-hero-poster.jpg", position: "center" },
  { src: "/journey/pawres-de-mayo/3.jpg", position: "center 60%" },
  { src: "/journey/beagle-buddies-pack-walk/3.jpg", position: "center" },
  { src: "/2-better/better2.jpg", position: "center 70%" },
  { src: "/journey/freehugs-bgc/2.jpg", position: "center" },
  { src: "/1-purpaws/purpaw7.jpg", position: "center" },
];
