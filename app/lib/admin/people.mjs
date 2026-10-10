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
export const memberNumber = (n) => (Number.isInteger(n) ? `HOR-${String(n).padStart(4, "0")}` : "");
