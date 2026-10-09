/**
 * Events shown on events.houseofretrieversph.org.
 *
 * Every field is a fact House of Retrievers supplies. Never fill one with a
 * guess: leave the event out until its details are confirmed. Events dated
 * before today (Asia/Manila) move to "Where we have been" automatically.
 *
 * @typedef {Object} HorEvent
 * @property {string} slug       URL-safe id, unique, e.g. "weekend-social-run-2026-10".
 * @property {string} title
 * @property {"Community outreach" | "Socials & runs" | "Workshops" | "Fundraisers"} category
 * @property {string} date       ISO date in Manila time, "YYYY-MM-DD".
 * @property {string} [startTime] 24-hour, "07:00".
 * @property {string} [endTime]   24-hour, "10:00".
 * @property {string} venue
 * @property {string} city
 * @property {string} [cost]     "Free" or an amount such as "₱500".
 * @property {string} [supports] The beneficiary HOR names up front.
 * @property {string} [summary]  One or two plain sentences.
 * @property {"open" | "few-left" | "full" | "no-rsvp" | "closed" | "cancelled"} status
 * @property {string} [image]    Approved HOR photo under public/, e.g. "/4-events/run.jpg".
 * @property {string} [imageAlt] What is actually in the frame.
 */

/** @type {HorEvent[]} */
export const events = [];
