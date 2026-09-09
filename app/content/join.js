import { HandHeart, HeartHandshake, UsersRound } from "lucide-react";

/**
 * The ways a visitor can join. Kept in sync with the server-side whitelist in
 * `app/api/join/route.js` — add a value in both places or it will be rejected.
 *
 * @type {readonly ["Member", "Volunteer", "Partner", "Sponsor"]}
 */
export const interests = ["Member", "Volunteer", "Partner", "Sponsor"];

/**
 * A "how to join" card in the pack section.
 *
 * @typedef {Object} JoinRoute
 * @property {string} number                   Two-digit step label.
 * @property {string} title                    Card headline.
 * @property {string} copy                     Supporting paragraph.
 * @property {import("react").ElementType} icon  Lucide icon component.
 */

/** @type {JoinRoute[]} */
export const joinRoutes = [
  {
    number: "01",
    title: "Become a member",
    copy: "Meet other furparents, trade notes on the everyday stuff, and come along to whatever we’re up to next.",
    icon: UsersRound,
  },
  {
    number: "02",
    title: "Volunteer together",
    copy: "Bring your time, your skills, or your friendly furbaby. No dog of your own? Come anyway — the help matters more.",
    icon: HandHeart,
  },
  {
    number: "03",
    title: "Partner for a cause",
    copy: "Build an activity with us around a beneficiary we name from the start, run openly the whole way through.",
    icon: HeartHandshake,
  },
];

/**
 * Field labels and placeholders that change with the selected interest.
 *
 * @typedef {Object} JoinFieldCopy
 * @property {string} profileLabel
 * @property {string} profilePlaceholder
 * @property {string} organizationLabel
 * @property {string} organizationPlaceholder
 * @property {string} furbabyLabel
 * @property {string} furbabyPlaceholder
 */

/** @type {Record<string, JoinFieldCopy>} */
export const joinFieldCopy = {
  Member: {
    profileLabel: "Instagram or Facebook profile (optional)",
    profilePlaceholder: "e.g. @yourhandle or profile URL",
    organizationLabel: "Organization or company name (optional)", organizationPlaceholder: "e.g. Acme Pet Care",
    furbabyLabel: "Furbaby name (optional)",
    furbabyPlaceholder: "e.g. Macchiato",
  },
  Volunteer: {
    profileLabel: "Instagram or Facebook profile (optional)",
    profilePlaceholder: "e.g. @yourhandle or profile URL",
    organizationLabel: "Organization or company name (optional)", organizationPlaceholder: "e.g. Acme Pet Care",
    furbabyLabel: "Furbaby name (optional)",
    furbabyPlaceholder: "e.g. Dallas, Faye, or your furbaby",
  },
  Partner: {
    profileLabel: "Instagram or Facebook profile (optional)",
    profilePlaceholder: "e.g. @yourhandle or organization profile URL",
    organizationLabel: "Organization or company name (optional)", organizationPlaceholder: "e.g. Acme Pet Care",
    furbabyLabel: "Furbaby name (optional)",
    furbabyPlaceholder: "e.g. the furbaby joining your activity",
  },
  Sponsor: {
    profileLabel: "Organization or company profile (optional)",
    profilePlaceholder: "e.g. your website or social profile",
    organizationLabel: "Organization or company name",
    organizationPlaceholder: "e.g. Acme Pet Care",
    furbabyLabel: "Furbaby name (optional)",
    furbabyPlaceholder: "e.g. the furbaby joining your activity",
  },
};
