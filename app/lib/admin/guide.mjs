import { PAGES, can } from "./roles.mjs";

/**
 * What each admin page is for and what View / Edit lets someone do there,
 * shared by Getting started and the on-screen tour (owner, 2026-10-27).
 */
export const HOW = {
  dashboard: { what: "A quick look at what needs attention: upcoming events, new sign-ups, waiting payments.", view: "Read only.", edit: "" },
  events: { what: "Every event: date, venue, tickets, poster and whether registration is open. Each event has its Guest tracker and Brand tracker.", view: "Open any event to read its details.", edit: "Press Create event, fill it in and Publish. Open one to edit it, invite guests and brands, or send its letters.", guide: true },
  registrations: { what: "Who signed up for each event, their tickets and payments.", view: "Pick an event to see its list and each person's details.", edit: "Check payments and send QR passes, add people by hand, email reminders, and check people in.", guide: true },
  checkin: { what: "Event-day check-in.", view: "See who is expected and who has arrived.", edit: "Pick the event, then scan each guest's QR code (or find their name) to check them in." },
  people: { what: "Members, volunteers, sponsors and partners who joined through the website.", view: "Search and read each person's details.", edit: "Update their status and notes, send them an email, or import a list." },
  supporters: { what: "Every brand HoR has worked with, and which are on the website.", view: "Read each brand's details and the events it joined.", edit: "Add a brand, put it on events, and get it ready for the website (logo, blurb).", guide: true },
  beneficiaries: { what: "The shelters, rescue groups and care homes HoR supports, and what they need.", view: "Read each beneficiary's details.", edit: "Add or edit beneficiaries, send them letters, and put them on the website." },
  guests: { what: "Everyone HOR sends letters to, grouped by the letter each category gets.", view: "See the guest list and who got which letter.", edit: "Add or edit guests and send each group its letter." },
  media: { what: "The press and partnership hub at media.houseofretrieversph.org.", view: "Read what's there.", edit: "Edit its wording, timeline, fact sheet and follower numbers, then Publish." },
  photographers: { what: "Who takes HOR's event photos, credited under “Photos by” on past events.", view: "See each photographer and the events they covered.", edit: "Add or edit a photographer, then tick them on an event's page." },
  payments: { what: "How people pay HoR (GCash, Maya, bank) for events and donations.", view: "See the current payment details.", edit: "Ask for a change. A different Owner must approve it before it goes live." },
  ledger: { what: "Every peso in and out for HoR: fees, donations, brand cash and in-kind, expenses, and what went to beneficiaries, with the transparency report.", view: "See the ledger and make the transparency report.", edit: "Add expenses with their receipts, in-kind items, other income and turnovers to beneficiaries.", guide: true },
  emails: { what: "The emails the website sends (confirmations, reminders).", view: "Read each template.", edit: "Edit the wording or make your own templates, and send yourself a test first.", guide: true },
  letters: { what: "Invitations, proposals and follow-ups: PDF letters, emails and invitation cards.", view: "Read letters and preview them.", edit: "Edit a letter or make your own, and fill in the standard details once.", guide: true },
  journey: { what: "The “Our journey” timeline on the homepage.", view: "Read the stops.", edit: "Add or edit a stop and its photos, then publish it." },
  breeds: { what: "The small breed icons shown with registrations.", view: "See the icons.", edit: "Add or change an icon." },
};

/** The pages this admin can use, in menu order, each with level "view" or "edit". */
export function guidePages(admin) {
  // The tour walks the sidebar; pages opened from events (the guest list) aren't there.
  return PAGES.filter((p) => !p.fromEvents).map((p) => ({ ...p, level: p.edit.some((cap) => can(admin, cap)) ? "edit" : can(admin, p.view[0]) ? "view" : "" })).filter((p) => p.level);
}
