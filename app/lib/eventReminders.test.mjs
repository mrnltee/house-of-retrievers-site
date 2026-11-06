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
