import { PAGES, can } from "./roles.mjs";

/**
 * What each admin page is for and what View / Edit lets someone do there,
 * shared by Getting started and the on-screen tour (owner, 2026-10-27).
 */
export const HOW = {
  dashboard: { what: "A quick look at what needs attention: upcoming events, new sign-ups, waiting payments.", view: "Read only.", edit: "" },
  events: { what: "Every event: date, venue, tickets, poster and whether registration is open.", view: "Open any event to read its details.", edit: "Create an event with “Create event”, edit one by opening it, and Save. Posters are 4:5; the cropper shows the frame." },
  registrations: { what: "Who signed up for each event, their tickets and payments.", view: "Pick an event to see its list and each person's details.", edit: "Add people by hand or import a spreadsheet, confirm payments, and edit or remove a registration." },
  checkin: { what: "Event-day check-in.", view: "See who is expected and who has arrived.", edit: "Pick the event, then scan each guest's QR code (or find their name) to check them in." },
  people: { what: "Members, volunteers, sponsors and partners who joined through the website.", view: "Search and read each person's details.", edit: "Update their status and notes, send them an email, or import a list." },
  supporters: { what: "Sponsors and partners and what each gives.", view: "Read each sponsor's details and history.", edit: "Add or edit a sponsor, import a spreadsheet, or delete a test entry." },
  beneficiaries: { what: "The animal shelters and rescue groups HOR supports, and what they need.", view: "Read each beneficiary's details.", edit: "Add or edit beneficiaries and send them letters." },
  guests: { what: "Everyone HOR sends letters to, grouped by the letter each category gets.", view: "See the guest list and who got which letter.", edit: "Add or edit guests and send each group its letter." },
  media: { what: "Photos and files used on the website.", view: "Browse what's there.", edit: "Upload, replace or remove photos." },
  payments: { what: "Where supporters send money (GCash, Maya, bank).", view: "See the current payment details.", edit: "Ask for a change. A different Owner must approve it before it goes live." },
  emails: { what: "The emails the website sends (confirmations, reminders).", view: "Read each template.", edit: "Edit the wording and send yourself a test first." },
  letters: { what: "Invitation and sponsorship letters, sent as PDFs.", view: "Read letters and preview the PDF.", edit: "Edit a letter, fill it in for someone and send it. Check the “Actual PDF” preview before sending." },
  journey: { what: "The “Our journey” timeline on the homepage.", view: "Read the stops.", edit: "Add or edit a stop and its photos, then publish it." },
  breeds: { what: "The small breed icons shown with registrations.", view: "See the icons.", edit: "Add or change an icon." },
};

/** The pages this admin can use, in menu order, each with level "view" or "edit". */
export function guidePages(admin) {
  return PAGES.map((p) => ({ ...p, level: p.edit.some((cap) => can(admin, cap)) ? "edit" : can(admin, p.view[0]) ? "view" : "" })).filter((p) => p.level);
}
