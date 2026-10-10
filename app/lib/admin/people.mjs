/** Follow-up statuses per kind of person from the Join form. The first is the default. */
export const PEOPLE_STATUSES = {
  Member: ["New", "Contacted", "Added to group chat", "Not interested"],
  Volunteer: ["New", "Contacted", "Onboarded", "Not available"],
  Sponsor: ["New", "Talking", "Confirmed", "Declined"],
  Partner: ["New", "Talking", "Confirmed", "Declined"],
};

export const PEOPLE_KINDS = Object.keys(PEOPLE_STATUSES);

/** Membership, for Members only. The member number and "member since" are set on first activation. */
export const MEMBERSHIP = [
  ["applicant", "Applicant", "Applied; not confirmed yet"],
  ["active", "Active", "Confirmed member"],
  ["inactive", "Inactive", "Hasn't taken part for a while"],
  ["left", "Left", "No longer a member"],
];
export const MEMBERSHIP_KEYS = MEMBERSHIP.map(([key]) => key);
export const membershipLabel = (key) => MEMBERSHIP.find(([k]) => k === key)?.[1] || "";

/** 7 → "HOR-0007". */
/**
 * "HOR-26-0001": the year they became a member (last two digits) and their
 * place in that year. Takes the person row ({ member_no, member_year }).
 */
export const memberNumber = (person) => {
  const n = Number(person?.member_no);
  const year = Number(person?.member_year);
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(year)) return "";
  return `HOR-${String(year % 100).padStart(2, "0")}-${String(n).padStart(4, "0")}`;
};
