/** Follow-up statuses per kind of person from the Join form. The first is the default. */
export const PEOPLE_STATUSES = {
  Member: ["New", "Contacted", "Added to group chat", "Not interested"],
  Volunteer: ["New", "Contacted", "Onboarded", "Not available"],
  Sponsor: ["New", "Talking", "Confirmed", "Declined"],
  Partner: ["New", "Talking", "Confirmed", "Declined"],
};

export const PEOPLE_KINDS = Object.keys(PEOPLE_STATUSES);

/**
 * Membership, for Members and Volunteers. The number and "member since" are
 * set on first activation.
 */
export const HAS_MEMBERSHIP = ["Member", "Volunteer"];
export const hasMembership = (kind) => HAS_MEMBERSHIP.includes(kind);
export const MEMBERSHIP = [
  ["applicant", "Applicant", "Applied; not confirmed yet"],
  ["active", "Active", "Confirmed member"],
  ["inactive", "Inactive", "Hasn't taken part for a while"],
  ["left", "Left", "No longer a member"],
];
export const MEMBERSHIP_KEYS = MEMBERSHIP.map(([key]) => key);
export const membershipLabel = (key) => MEMBERSHIP.find(([k]) => k === key)?.[1] || "";
const VOLUNTEER_HINTS = { applicant: "Signed up; not confirmed yet", active: "Confirmed volunteer", inactive: "Hasn't helped out for a while", left: "No longer volunteering" };
/** The membership choices, with hints worded for the kind of person. */
export const membershipFor = (kind) => (kind === "Volunteer" ? MEMBERSHIP.map(([k, l]) => [k, l, VOLUNTEER_HINTS[k]]) : MEMBERSHIP);

/** Number prefix per kind: members HOR-, volunteers HORV-. Each kind counts on its own. */
export const NUMBER_PREFIX = { Member: "HOR", Volunteer: "HORV" };

/**
 * "HOR-26-0001" (member) or "HORV-26-0001" (volunteer): the year they
 * registered (last two digits) and their place in that year, counted per
 * kind. Takes the person row ({ kind, member_no, member_year }).
 */
export const memberNumber = (person) => {
  const n = Number(person?.member_no);
  const year = Number(person?.member_year);
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(year)) return "";
  return `${NUMBER_PREFIX[person?.kind] || "HOR"}-${String(year % 100).padStart(2, "0")}-${String(n).padStart(4, "0")}`;
};
