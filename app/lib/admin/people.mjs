/** Follow-up statuses per kind of person from the Join form. The first is the default. */
export const PEOPLE_STATUSES = {
  Member: ["New", "Contacted", "Added to group chat", "Not interested"],
  Volunteer: ["New", "Contacted", "Onboarded", "Not available"],
  Sponsor: ["New", "Talking", "Confirmed", "Declined"],
  Partner: ["New", "Talking", "Confirmed", "Declined"],
};

export const PEOPLE_KINDS = Object.keys(PEOPLE_STATUSES);
