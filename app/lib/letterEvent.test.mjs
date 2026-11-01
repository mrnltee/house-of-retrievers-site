import { test } from "node:test";
import assert from "node:assert/strict";
import { EVENT_BLANKS, EVENT_FILLS, eventBlankValues, eventLetterKey } from "./letterEvent.mjs";

const event = {
  title: "Golden Beginning: Paws and Purpose", slug: "golden-beginning-2026-11", date: "2026-11-30", start_time: "14:30", end_time: "18:00", all_day: false,
  venue: "Novotel Manila Araneta City", venue_address: "General Aguinaldo Avenue, Araneta City", city: "Quezon City", cost: "₱1,750 per pair",
};

test("an event's details fill its letter blanks", () => {
  const v = eventBlankValues(event, { partners: ["Novotel Manila Araneta City", "Bark Boulevard PH"], sponsors: ["Vitality", "GRWM", "Fluffy Fab"], beneficiaries: ["Pawssion Project"], link: "https://events.houseofretrieversph.org/golden-beginning-2026-11" });
  assert.equal(v["Event Name"], "Golden Beginning: Paws and Purpose");
  assert.equal(v["Event Short Name"], "Golden Beginning");
  assert.equal(v["Event Date"], "Monday, November 30, 2026");
  assert.equal(v["Event Time"], "2:30 – 6:00 PM");
  assert.equal(v["Event Venue"], "Novotel Manila Araneta City");
  assert.equal(v["Event Address"], "General Aguinaldo Avenue, Araneta City");
  assert.equal(v["Event Location"], "Novotel Manila Araneta City, Quezon City");
  assert.equal(v["Event Link"], "https://events.houseofretrieversph.org/golden-beginning-2026-11");
  assert.equal(v["Event Partners"], "Novotel Manila Araneta City and Bark Boulevard PH");
  assert.equal(v["Event Sponsors"], "Vitality, GRWM and Fluffy Fab");
  assert.equal(v["Event Beneficiaries"], "Pawssion Project");
  assert.equal(v["Event Price"], "₱1,750 per pair");
});

test("times: morning to afternoon, all day, start only; nothing invented when details are missing", () => {
  assert.equal(eventBlankValues({ ...event, start_time: "09:00", end_time: "13:15" })["Event Time"], "9:00 AM – 1:15 PM");
  assert.equal(eventBlankValues({ ...event, all_day: true })["Event Time"], "All day");
  assert.equal(eventBlankValues({ ...event, end_time: null })["Event Time"], "2:30 PM");
  const bare = eventBlankValues({ title: "Retriever Romp" });
  assert.equal(bare["Event Short Name"], "Retriever Romp");
  assert.equal(bare["Event Date"], "");
  assert.equal(bare["Event Sponsors"], "");
  assert.deepEqual(eventBlankValues(null), {});
});

test("every event fill-in is described, and event letter keys are valid letter keys", () => {
  assert.deepEqual(Object.keys(EVENT_FILLS), EVENT_BLANKS);
  assert.ok(EVENT_BLANKS.includes("Event Sponsors"));
  const key = eventLetterKey("Sponsorship letter — Golden Beginning!");
  assert.match(key, /^ev-[a-z0-9-]+-[a-z0-9]{4}$/);
  assert.ok(key.length <= 60);
});
