/**
 * A founding family photocard in the pack section.
 *
 * @typedef {Object} Family
 * @property {string} group                 Family name shown above the members.
 * @property {string} names                 Retriever names.
 * @property {string} note                  Social handle, or a short note on placeholder cards.
 * @property {"cream"|"gold"|"sage"} tone    Card colour treatment.
 * @property {string} [socialUrl]           Profile link. Omitted on placeholder cards.
 * @property {string} [frontImage]          Front photocard in `public/`.
 * @property {string} [backImage]           Back photocard in `public/`.
 * @property {string} [imageAlt]            Alternative text for the front photocard.
 * @property {boolean} [noAvatar]           Renders a non-flipping placeholder card.
 */

/** @type {Family[]} */
export const families = [
  {
    group: "The Golden Nuggets",
    names: "Sir Dallas & Mary Jane",
    note: "@thegolden.nuggets",
    socialUrl: "https://www.instagram.com/thegolden.nuggets/",
    tone: "cream",
    frontImage: "/DallasMJFrontCard.jpg",
    backImage: "/dallasMJBackCard.jpg",
    imageAlt: "Sir Dallas and Mary Jane front photocard",
  },
  {
    group: "The Caffeine Family",
    names: "Macchiato",
    note: "@dailydoseofmacchiato_",
    socialUrl: "https://www.instagram.com/dailydoseofmacchiato_/",
    tone: "gold",
    frontImage: "/MacchiFrontCard.jpg",
    backImage: "/MacchiBackCard.jpg",
    imageAlt: "Macchiato front photocard",
  },
  {
    group: "The Pancake family",
    names: "Faye",
    note: "@itsmefayethepancakee",
    socialUrl: "https://www.instagram.com/itsmefayethepancakee/",
    tone: "sage",
    frontImage: "/FayeFrontCard.jpg",
    backImage: "/FayeBackCard.jpg",
    imageAlt: "Faye front photocard",
  },
  {
    group: "The LL Golden Bros",
    names: "Luka & Luji",
    note: "@lukaxluji_goldenbros",
    socialUrl: "https://www.instagram.com/lukaxluji_goldenbros/",
    tone: "cream",
    frontImage: "/LukaLujiFrontCard.jpg",
    backImage: "/LukaLujiBackCard.jpg",
    imageAlt: "Luka and Luji front photocard",
  },
  {
    group: "The Bear Bros",
    names: "Molly & Maverick",
    note: "@molly.maverickthebears",
    socialUrl: "https://www.instagram.com/molly.maverickthebears/",
    tone: "gold",
    frontImage: "/MollyMavFrontCard.jpg",
    backImage: "/MollyMavBackCard.jpg",
    imageAlt: "Molly and Maverick front photocard",
  },
  {
    group: "Growing together",
    names: "More family stories soon",
    note: "Ready for verified sibling and family details",
    tone: "sage",
    noAvatar: true,
  },
];
