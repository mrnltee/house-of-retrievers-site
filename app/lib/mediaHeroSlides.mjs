/**
 * The media hub hero's background slideshow (owner, 26 Nov 2026): set in Admin → Media hub
 * → "Top of the page: background slideshow" and saved as `heroSlideshow` in the published
 * content (no migration). `cleanHeroSlideshow` is the one reader: the public page, the save
 * action and the editor all go through it, so a bad or old value falls back to the defaults.
 *
 * The hero's CSS background is the original poster, which stays the fallback before the
 * slideshow loads, without JavaScript, under reduced motion, and when it is switched off.
 */

/** Wide photos (3:2 or wider, at least 1000 px) HoR may choose from, with what is in each. */
export const HERO_PHOTO_CHOICES = [
  { src: "/house-of-retrievers-hero-poster.jpg", label: "Hero photo (original)", alt: "Members and their furbabies gathered on the lawn at Parklinks Pet Park" },
  { src: "/journey/pawres-de-mayo/1.jpg", label: "Pawres de Mayo · 1", alt: "A host on stage with a baby in a carrier and a golden retriever in a cream dress" },
  { src: "/journey/pawres-de-mayo/2.jpg", label: "Pawres de Mayo · 2", alt: "Two golden retrievers in party dresses grinning at the camera" },
  { src: "/journey/pawres-de-mayo/3.jpg", label: "Pawres de Mayo · 3", alt: "Members and their golden retrievers gathered on the lawn for a group photo" },
  { src: "/journey/pawres-de-mayo/4.jpg", label: "Pawres de Mayo · 4", alt: "Two members lifting their golden retrievers up in front of the Parklinks fence" },
  { src: "/journey/pawres-de-mayo/5.jpg", label: "Pawres de Mayo · 5", alt: "The pack lined up under the tents with their dogs in costume" },
  { src: "/journey/pawres-de-mayo/6.jpg", label: "Pawres de Mayo · 6", alt: "A member kneeling with his golden retriever in a gown, holding up a certificate" },
  { src: "/journey/beagle-buddies-pack-walk/1.jpg", label: "Pack walk · 1", alt: "Walkers and their dogs filling the road at Ayala Avenue" },
  { src: "/journey/beagle-buddies-pack-walk/2.jpg", label: "Pack walk · 2", alt: "A golden retriever in a sequined bandana walking beside its owner" },
  { src: "/journey/beagle-buddies-pack-walk/3.jpg", label: "Pack walk · 3", alt: "Beagles and their owners in matching shirts leading part of the walk" },
  { src: "/journey/beagle-buddies-pack-walk/4.jpg", label: "Pack walk · 4", alt: "A golden retriever in a pink cap walking ahead of the House of Retrievers banner" },
  { src: "/journey/beagle-buddies-pack-walk/5.jpg", label: "Pack walk · 5", alt: "Walkers carrying the Beagle Buddies PH flag with beagles on leash" },
  { src: "/journey/beagle-buddies-pack-walk/6.jpg", label: "Pack walk · 6", alt: "Beagles and their owners meeting on the sidewalk after the walk" },
  { src: "/journey/freehugs-bgc/1.jpg", label: "Free Hugs · 1", alt: "Two visitors crouching on the grass to hug a golden retriever" },
  { src: "/journey/freehugs-bgc/2.jpg", label: "Free Hugs · 2", alt: "A woman in pink kneeling to greet a golden retriever and two small white dogs" },
  { src: "/journey/freehugs-bgc/3.jpg", label: "Free Hugs · 3", alt: "A golden retriever with a Free Hugs sign resting on a bench as a boy pets it" },
  { src: "/journey/freehugs-bgc/4.jpg", label: "Free Hugs · 4", alt: "A golden retriever lying on the grass with its eyes half closed" },
  { src: "/journey/freehugs-bgc/5.jpg", label: "Free Hugs · 5", alt: "A child reaching out to a happy golden retriever" },
  { src: "/journey/freehugs-bgc/6.jpg", label: "Free Hugs · 6", alt: "A visitor kneeling beside a golden retriever wearing a Free Hugs sign" },
  { src: "/journey/milagros-elderly-shelter/1.jpg", label: "Milagros visit · 1", alt: "House of Retrievers receiving a certificate of appreciation under the Milagros welcome screen" },
  { src: "/journey/milagros-elderly-shelter/2.jpg", label: "Milagros visit · 2", alt: "Staff, members and golden retrievers together for a group photo at Milagros" },
  { src: "/journey/milagros-elderly-shelter/3.jpg", label: "Milagros visit · 3", alt: "Golden retrievers in red bandanas greeting residents seated in wheelchairs" },
  { src: "/journey/milagros-elderly-shelter/4.jpg", label: "Milagros visit · 4", alt: "A resident in a wheelchair reaching down to pet a golden retriever" },
  { src: "/journey/milagros-elderly-shelter/5.jpg", label: "Milagros visit · 5", alt: "A caregiver kneeling beside a resident as a golden retriever rests its head on his lap" },
  { src: "/journey/milagros-elderly-shelter/6.jpg", label: "Milagros visit · 6", alt: "Several hands petting a golden retriever in a blue bandana" },
  { src: "/1-purpaws/purpaw3.jpg", label: "Care home visit · 3", alt: "A golden retriever in a House of Retrievers bandana resting on the floor as residents watch" },
  { src: "/1-purpaws/purpaw4.jpg", label: "Care home visit · 4", alt: "A resident cupping a golden retriever's face while a volunteer steadies the dog" },
  { src: "/1-purpaws/purpaw5.jpg", label: "Care home visit · 5", alt: "A volunteer in a House of Retrievers shirt crouching beside a golden retriever near the refreshments" },
  { src: "/1-purpaws/purpaw7.jpg", label: "Care home visit · 7", alt: "A small child meeting two golden retrievers in bandanas beside the refreshments table" },
  { src: "/1-purpaws/purpaw8.jpg", label: "Care home visit · 8", alt: "A resident in a wheelchair reaching out to the golden retrievers gathered around him" },
  { src: "/1-purpaws/purpaw10.jpg", label: "Care home visit · 10", alt: "A resident's hand and a volunteer's hand resting together on a golden retriever's head" },
  { src: "/1-purpaws/purpaw11.jpg", label: "Care home visit · 11", alt: "A golden retriever waiting beside a resident's wheelchair as a nurse looks on" },
  { src: "/1-purpaws/purpaw12.jpg", label: "Care home visit · 12", alt: "A child in a House of Retrievers shirt walking a golden retriever through the visit" },
  { src: "/1-purpaws/purpaw13.jpg", label: "Care home visit · 13", alt: "A golden retriever in a blue House of Retrievers bandana being petted during the visit" },
  { src: "/1-purpaws/purpaw14.jpg", label: "Care home visit · 14", alt: "A resident reaching toward a golden retriever that lifts its head to meet her hand" },
  { src: "/1-purpaws/purpaw15.jpg", label: "Care home visit · 15", alt: "A golden retriever leaning in to be petted by a resident while a nurse steadies the wheelchair" },
  { src: "/2-better/better1.jpg", label: "Surf day · 1", alt: "Members and their golden retrievers sharing paddleboards out in the surf" },
  { src: "/2-better/better2.jpg", label: "Surf day · 2", alt: "Six golden retrievers in bandanas lined up together at the San Juan surf shop" },
];

/** Which part of a photo stays in view when the hero crops it. */
export const HERO_FOCUS = [
  { key: "top", label: "Top", position: "center 25%" },
  { key: "center", label: "Middle", position: "center" },
  { key: "bottom", label: "Bottom", position: "center 75%" },
];

export const HERO_MAX_SLIDES = 8;
export const HERO_SECONDS = { min: 4, max: 12, default: 6 };
export const HERO_FADE = { min: 0.8, max: 4, default: 2 };

export const DEFAULT_HERO_SLIDESHOW = {
  on: true,
  seconds: HERO_SECONDS.default,
  fade: HERO_FADE.default,
  zoom: true,
  slides: [
    { src: "/house-of-retrievers-hero-poster.jpg", focus: "center" },
    { src: "/journey/pawres-de-mayo/3.jpg", focus: "bottom" },
    { src: "/journey/beagle-buddies-pack-walk/3.jpg", focus: "center" },
    { src: "/2-better/better2.jpg", focus: "bottom" },
    { src: "/journey/freehugs-bgc/2.jpg", focus: "center" },
    { src: "/1-purpaws/purpaw7.jpg", focus: "center" },
  ],
};

const CHOICE = new Map(HERO_PHOTO_CHOICES.map((choice) => [choice.src, choice]));
const FOCUS = new Map(HERO_FOCUS.map((focus) => [focus.key, focus]));

function clamp(value, { min, max, default: fallback }, step) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number / step) * step));
}

/** Settings from the editor (JSON text or an object): known photos only, once each, up to 8; timings within range. */
export function cleanHeroSlideshow(value) {
  let raw = value;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  if (!raw || typeof raw !== "object") return DEFAULT_HERO_SLIDESHOW;
  const seen = new Set();
  const slides = (Array.isArray(raw.slides) ? raw.slides : [])
    .filter((slide) => slide && CHOICE.has(slide.src) && !seen.has(slide.src) && seen.add(slide.src))
    .slice(0, HERO_MAX_SLIDES)
    .map((slide) => ({ src: slide.src, focus: FOCUS.has(slide.focus) ? slide.focus : "center" }));
  const fade = clamp(raw.fade, HERO_FADE, 0.1);
  // A photo stays at least two seconds clear of its own fade.
  const seconds = Math.max(clamp(raw.seconds, HERO_SECONDS, 0.5), Math.ceil(fade + 2));
  return {
    on: raw.on !== false,
    seconds: Math.min(seconds, HERO_SECONDS.max),
    fade,
    zoom: raw.zoom !== false,
    slides: slides.length ? slides : DEFAULT_HERO_SLIDESHOW.slides,
  };
}

/** What the public page draws: each slide's photo and crop, or none when switched off. */
export function heroSlides(settings) {
  const clean = cleanHeroSlideshow(settings);
  if (!clean.on) return [];
  return clean.slides.map((slide) => ({ src: slide.src, position: FOCUS.get(slide.focus).position, alt: CHOICE.get(slide.src).alt }));
}

export function heroChoice(src) {
  return CHOICE.get(src) || null;
}
