/**
 * What an event's Category means for the admin (7 Nov 2026, owner). Socials,
 * Workshops and Wellness are activities (a playdate, a class), not fundraising:
 * no guest list, no charity block for a new event, and the people who sign up
 * are called Participants. Fundraisers and Community outreach keep the guest
 * list, donors, beneficiaries and letters. An event with no category yet is
 * treated like a fundraiser, which is how every event worked before.
 */
export const ACTIVITY_CATEGORIES = ["Socials & runs", "Workshops", "Wellness"];

export const isActivityCategory = (category) => ACTIVITY_CATEGORIES.includes(category);

/** The guest list is for fundraisers and outreach. */
export const showsGuestList = (category) => !isActivityCategory(category);

/** What the people who sign up are called in the admin. */
export const participantsLabel = (category) => (isActivityCategory(category) ? "Participants" : "RSVPs");
