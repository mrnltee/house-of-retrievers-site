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

/**
 * Who a registrant is on People (owner, 19 Nov 2026): the People records with the registration's email
 * (any case), best first. An active member leads, then an active volunteer, then other memberships, then
 * partners and sponsors. Returns { person, label, tone, others } or null when the email isn't on People.
 * label reads "Member · HOR-26-0012", "Member applicant", "Former member", "Volunteer · HORV-26-0003", "Partner".
 */
const MATCH_RANK = (p) => {
  const active = p.membership === "active";
  if (p.kind === "Member") return active ? 0 : p.membership === "left" ? 4 : 2;
  if (p.kind === "Volunteer") return active ? 1 : p.membership === "left" ? 5 : 3;
  return 6;
};
export function peopleMatch(records = []) {
  const list = (records || []).filter((p) => p && p.id).slice().sort((a, b) => MATCH_RANK(a) - MATCH_RANK(b));
  if (!list.length) return null;
  const [person, ...rest] = list;
  let label = person.kind || "On People";
  let tone = "";
  if (hasMembership(person.kind)) {
    const word = person.kind === "Volunteer" ? "Volunteer" : "Member";
    const number = memberNumber(person);
    if (person.membership === "active") { label = number ? `${word} · ${number}` : word; tone = "ok"; }
    else if (person.membership === "inactive") label = `${word} · inactive`;
    else if (person.membership === "left") label = `Former ${word.toLowerCase()}`;
    else label = `${word} applicant`;
  }
  return { person, label, tone, others: rest.map((p) => p.kind).filter(Boolean) };
}
