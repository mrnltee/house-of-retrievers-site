/**
 * A sample answer for each blank, shown greyed in the box as a hint when
 * sending (owner, 2026-10-28). Never sent: the sender types the real value.
 * Keyed by blank label; `byLetter` gives a letter its own sample where the
 * purpose differs. Names and numbers below are the ones HOR's letters use.
 */
const SAMPLES = {
  Address: "e.g. 123 Katipunan Ave., Quezon City 1108",
  "HOR Bank": "e.g. BDO Unibank, Araneta Center branch",
  "HOR Account Name": "e.g. The House of Retrievers Society Inc.",
  "HOR Account Number": "e.g. 0012 3456 7890",
  "HOR GCash Number / Name": "e.g. 0969 086 3183 / Angelique Serrano",
  "Proposed Partner Designation": "e.g. Official Pet Food Partner",
  "Product / Service": "e.g. grain-free dog treats",
  "Specific Reason the Brand Fits the Event and Its Guests": "e.g. our guests are furparents who care about what their dogs eat, and many will bring their dogs",
  "Product / Service and Quantity": "e.g. 150 sample packs of dog treats",
  "Intended Use": "e.g. guest giveaways and goody bags",
  "Brief Summary of the Benefits Offered in Annex A": "e.g. logo on the event poster, a sampling table and a dedicated social post",
  "Proposed Support": "e.g. a monthly supply of dog food and vitamins, and help with vet bills for rescued animals",
  "Additional Details": "e.g. We would also like to invite your team to our launch on November 30, 2026.",
  "Event Name": "e.g. A Golden Beginning: Paws & Purpose",
  "Event Short Name": "e.g. A Golden Beginning",
  "Reply Deadline": "e.g. November 6, 2026",
  "Proposal Reference": "e.g. HOR-XD-2026-001",
  "Version / Date": "e.g. Version 1 – October 28, 2026",
  "Product or service name and exact description": "e.g. Brand X Grain-Free Chicken Bites, 50 g pouches",
  "Quantity, unit or serving size, variants, packaging and any equipment included": "e.g. 150 pouches (50 g), chicken flavour, in 3 cartons; no equipment",
  "Guest refreshments / sampling / giveaways / beneficiary donation — specify the agreed use": "e.g. 100 for goody bags, 50 donated to the beneficiary shelter",
  "Date, time, location, receiving contact and any staff or support required": "e.g. November 29, 2026, 3:00 PM, Novotel Araneta loading bay; receive: Angelique Serrano; no staff needed",
  "Agreed peso value and valuation basis": "e.g. ₱15,000, at the brand's retail price",
  "Assign transport, staffing, equipment, setup, storage, cleanup and any related costs to HOR or the partner. For food or drinks, specify handling, shelf-life and serving requirements.": "e.g. Partner delivers and sets up; HOR stores overnight; best before December 2026, keep dry",
  "Confirmation date; logo/artwork deadline; delivery or service date.": "e.g. Confirm by November 6; logo by November 10; deliver November 29, 2026",
  "Confirmation Deadline": "e.g. November 6, 2026",
  "3–5 minutes": "e.g. 3–5 minutes",
  "Area of Animal-Welfare Advocacy": "e.g. shelter rescue and adoption",
  "Relevant Initiative or Contribution": "e.g. your adoption drives for senior dogs",
  "Proposed Topic or Theme": "e.g. what shelters need most, and how furparents can help",
  "Talk Duration": "e.g. 10 minutes",
  "Contact Person": "e.g. Angelique Serrano",
  "Contact Mobile": "e.g. 0969 086 3183",
  "Contact Email": "e.g. houseofretrieversph@gmail.com",
  "Reply Date": "e.g. November 10, 2026",
  "Signatory Name": "e.g. Ms. Alyzza Angeles",
  "Signatory Position": "e.g. President",
  "Personal Connection to Animals, Advocacy or Specific Reason for the Invitation": "e.g. love for your rescued Aspin, Mochi, which so many of your followers know",
  "Number of Creator Slots": "e.g. 10",
  "Relevant Content, Advocacy or Specific Reason for the Invitation": "e.g. warm, honest videos about life with your two Golden Retrievers",
};

const byLetter = {};

/** The sample answer for a blank, or "" when there is none. */
export function blankSample(label, letterKey) {
  const base = String(label || "").replace(/\?$/, "").trim();
  return byLetter[letterKey]?.[base] ?? SAMPLES[base] ?? "";
}
