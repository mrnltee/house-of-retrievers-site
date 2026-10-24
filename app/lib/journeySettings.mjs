/** Admin-configurable display of the "Our journey" homepage timeline (app/components/Journey.jsx). */

export const JOURNEY_ORIENTATIONS = ["vertical", "horizontal"];

export const DEFAULT_JOURNEY_SETTINGS = { show: true, orientation: "vertical" };

/** @param {unknown} value @returns {"vertical"|"horizontal"} */
export function cleanJourneyOrientation(value) {
  return JOURNEY_ORIENTATIONS.includes(value) ? value : "vertical";
}

/** @param {unknown} value @returns {boolean} */
export function cleanJourneyShow(value) {
  return value === true || value === "true" || value === "on";
}
