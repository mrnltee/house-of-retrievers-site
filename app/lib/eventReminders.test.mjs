import test from "node:test";
import assert from "node:assert/strict";
import { reminderEligibility, readReminderIds, wordingKey } from "./eventReminders.mjs";
import { EDITABLE_TEMPLATES, eventReminder, unknownVariables } from "./emailTemplates.mjs";

const reg = (over = {}) => ({ status: "confirmed", fee_status: "paid", email: "a@b.co", ...over });

test("reminderEligibility: confirmed and, on a paid event, paid", () => {
  assert.equal(reminderEligibility(reg(), { feeRequired: true }).ok, true);
  assert.equal(reminderEligibility(reg({ fee_status: "not_due" }), { feeRequired: false }).ok, true);
  assert.match(reminderEligibility(reg({ fee_status: "waiting" }), { feeRequired: true }).reason, /Payment/);
  assert.match(reminderEligibility(reg({ status: "waitlist" })).reason, /waitlist/);
  assert.equal(reminderEligibility(reg({ status: "cancelled" })).ok, false);
  assert.equal(reminderEligibility(reg({ deleted_at: "2026-11-01" })).ok, false);
  assert.equal(reminderEligibility(reg({ email: "" })).ok, false);
});

test("readReminderIds keeps only unique uuids", () => {
  const id = "14d131c3-cebf-4d05-8bdc-c0df2583ad4c";
  assert.deepEqual(readReminderIds([id, id.toUpperCase(), "nope", "", null]), [id]);
});

test("wordingKey changes with the wording", () => {
  const a = { subject: "s", greeting: "", heading: "h", message: "m" };
  assert.equal(wordingKey(a), wordingKey({ ...a }));
  assert.notEqual(wordingKey(a), wordingKey({ ...a, message: "m2" }));
});

test("the reminder template only uses variables it offers, and renders the pass", () => {
  const t = EDITABLE_TEMPLATES["event-reminder"];
  assert.deepEqual(unknownVariables("event-reminder", t.defaults), []);
  const event = { title: "Retriever Romp", date: "2026-11-15", startTime: "08:00", venue: "Park", city: "Taguig" };
  const mail = eventReminder({ name: "Juan dela Cruz", event, passUrl: "https://events.example/r/ABC", code: "7KQ2MPX4RT" });
  assert.match(mail.subject, /Retriever Romp/);
  assert.match(mail.html, /Open my pass/);
  assert.match(mail.html, /7KQ2MPX4RT/);
  assert.match(mail.html, /Juan/);
  const ack = eventReminder({ name: "Juan", event, passUrl: "https://x/consent", code: "7KQ2MPX4RT", consentRequired: true });
  assert.match(ack.html, /Review and acknowledge/);
  assert.doesNotMatch(ack.html, /7KQ2MPX4RT/);
});

test("HOR can write its own reminder templates", async () => {
  const { CUSTOM_KINDS, templateDef, unknownVariables } = await import("./emailTemplates.mjs");
  assert.equal(CUSTOM_KINDS.reminder.event, true);
  assert.equal(templateDef("custom:reminder"), CUSTOM_KINDS.reminder);
  assert.deepEqual(unknownVariables("custom:reminder", { message: "Hi {{first_name}}, see you at {{event_title}} {{nope}}" }), ["nope"]);
});

test("the event box in event emails is editable wording", async () => {
  const { renderTemplate, SAMPLE_PERSON, EVENT_DETAILS_DEFAULT } = await import("./emailTemplates.mjs");
  const std = renderTemplate("event-reminder", null, SAMPLE_PERSON).html;
  assert.match(std, /Bedazzle Barkdate/);
  assert.match(std, /Wiltlover Café, Pasay/);
  // explicit default text gives the same box as none saved
  assert.equal(renderTemplate("event-reminder", { details: EVENT_DETAILS_DEFAULT }, SAMPLE_PERSON).html, std);
  // reworded
  const custom = renderTemplate("event-reminder", { details: "**Meet at the gate**\n{{event_date}}" }, SAMPLE_PERSON).html;
  assert.match(custom, /Meet at the gate/);
  assert.doesNotMatch(custom, /<br>Wiltlover/);
  // saved empty = no box at all
  assert.doesNotMatch(renderTemplate("event-reminder", { details: "" }, SAMPLE_PERSON).html, /<strong>Bedazzle Barkdate<\/strong>/);
});
