import { HandHeart, HeartHandshake, UsersRound } from "lucide-react";

/**
 * The ways a visitor can join. Kept in sync with the server-side whitelist in
 * `app/api/join/route.js` — add a value in both places or it will be rejected.
 *
 * @type {readonly ["Member", "Volunteer", "Partner"]}
 */
export const interests = ["Member", "Volunteer", "Partner"];

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
    copy: "Meet fellow retriever families, trade notes on everyday care, and join community activities.",
    icon: UsersRound,
  },
  {
    number: "02",
    title: "Volunteer together",
    copy: "Bring your time, skills, or friendly retriever to outreach programs where your presence can help.",
    icon: HandHeart,
  },
  {
    number: "03",
    title: "Partner for a cause",
    copy: "Collaborate on an activity built around a named beneficiary, run openly from start to finish.",
    icon: HeartHandshake,
  },
];

/**
 * Field labels and placeholders that change with the selected interest.
 *
 * @typedef {Object} JoinFieldCopy
 * @property {string} profileLabel
 * @property {string} profilePlaceholder
 * @property {string} furbabyLabel
 * @property {string} furbabyPlaceholder
 */

/** @type {Record<string, JoinFieldCopy>} */
export const joinFieldCopy = {
  Member: {
    profileLabel: "Instagram or Facebook profile (optional)",
    profilePlaceholder: "e.g. @yourhandle or profile URL",
    furbabyLabel: "Furbaby name (optional)",
    furbabyPlaceholder: "e.g. Macchiato",
  },
  Volunteer: {
    profileLabel: "Instagram or Facebook profile (optional)",
    profilePlaceholder: "e.g. @yourhandle or profile URL",
    furbabyLabel: "Furbaby name (optional)",
    furbabyPlaceholder: "e.g. Dallas, Faye, or your furbaby",
  },
  Partner: {
    profileLabel: "Instagram or Facebook profile (optional)",
    profilePlaceholder: "e.g. @yourhandle or organization profile URL",
    furbabyLabel: "Furbaby name (optional)",
    furbabyPlaceholder: "e.g. the furbaby joining your activity",
  },
};
