import test from "node:test";
import assert from "node:assert/strict";
import { cleanQuery, furbabiesOf, likePattern, pastPeopleSuggestions } from "./pastPeople.mjs";

const NOW = new Date("2026-11-26T08:00:00Z");
const EVENT = "11111111-1111-1111-1111-111111111111";
const OLD = "22222222-2222-2222-2222-222222222222";

test("cleanQuery and likePattern", () => {
  assert.equal(cleanQuery(" a "), "");
  assert.equal(cleanQuery("  Shey   Tan "), "Shey Tan");
  assert.equal(likePattern("50%_a\\b"), "%50\\%\\_a\\\\b%");
});

test("furbabiesOf: names with their breeds, genders and ages; angels left out", () => {
  const row = { furbaby_name: "Khalee and Audrey", furbaby_breeds: ["golden-retriever", "aspin"], furbaby_sexes: ["female", ""], furbaby_ages: ["3", "1"], furbaby_rainbow: [false, true] };
  assert.deepEqual(furbabiesOf(row, { now: NOW }), [{ name: "Khalee", breed: "golden-retriever", sex: "female", age: "3" }]);
  assert.deepEqual(furbabiesOf({ furbaby_name: "", furbaby_count: 0 }), []);
});

test("furbabiesOf: ages grow from the day they were given", () => {
  const row = { furbaby_name: "Mochi", furbaby_ages: ["2"] };
  assert.deepEqual(furbabiesOf(row, { now: NOW, agesOn: "2025-11-01" }), [{ name: "Mochi", breed: "", sex: "", age: "3" }]);
});

test("one suggestion per name + email, People record first for furbabies", () => {
  const people = [{ id: "p1", kind: "Member", membership: "active", member_no: 12, member_year: 2026, name: "Shey Tan", email: "Shey@Example.test", furbaby_name: "Macchiato", furbaby_breeds: ["labrador-retriever"] }];
  const registrations = [
    { name: "shey  tan", email: "shey@example.test", furbaby_name: "Old Name", furbaby_count: 1, created_at: "2026-10-01T00:00:00Z", event_id: OLD, event_title: "Pawres de Mayo", event_date: "2026-05-10" },
    { name: "Shey Tan", email: "shey@example.test", furbaby_name: "Mac", furbaby_count: 1, created_at: "2026-09-01T00:00:00Z", event_id: OLD, event_title: "Pawres de Mayo", event_date: "2026-05-10" },
  ];
  const [s, ...rest] = pastPeopleSuggestions({ query: "shey", people, registrations, eventId: EVENT, now: NOW });
  assert.equal(rest.length, 0);
  assert.equal(s.name, "Shey Tan");
  assert.equal(s.label, "Member · HOR-26-0012");
  assert.equal(s.tone, "ok");
  assert.equal(s.detail, "Last RSVP: Pawres de Mayo · May 2026");
  assert.deepEqual(s.furbabies, [{ name: "Macchiato", breed: "labrador-retriever", sex: "", age: "" }]);
  assert.equal(s.here, false);
});

test("a shared household email gives one suggestion per person", () => {
  const registrations = [
    { name: "Ana Cruz", email: "home@example.test", furbaby_name: "Bo", created_at: "2026-10-01", event_id: OLD, event_title: "Free Hugs" },
    { name: "Ben Cruz", email: "home@example.test", furbaby_name: "Bo", created_at: "2026-10-01", event_id: OLD, event_title: "Free Hugs" },
  ];
  const list = pastPeopleSuggestions({ query: "cruz", registrations, now: NOW });
  assert.deepEqual(list.map((s) => s.name), ["Ana Cruz", "Ben Cruz"]);
  assert.equal(list[0].label, "Past RSVP");
});

test("someone already on this event goes last and says so; exact and starts-with names lead", () => {
  const registrations = [
    { name: "Mia Lopez", email: "mia@example.test", created_at: "2026-11-20", event_id: EVENT, event_title: "Now" },
    { name: "Amia Reyes", email: "amia@example.test", created_at: "2026-11-01", event_id: OLD, event_title: "Then" },
    { name: "Mia", email: "m@example.test", created_at: "2026-01-01", event_id: OLD, event_title: "Then" },
  ];
  const list = pastPeopleSuggestions({ query: "mia", registrations, eventId: EVENT, now: NOW });
  assert.deepEqual(list.map((s) => s.name), ["Mia", "Amia Reyes", "Mia Lopez"]);
  assert.equal(list[2].here, true);
});

test("furbabies come from the most detailed past RSVP when there's no People record", () => {
  const registrations = [
    { name: "Jo", email: "jo@example.test", furbaby_name: "Pip", furbaby_count: 1, created_at: "2026-11-01", event_id: OLD },
    { name: "Jo", email: "jo@example.test", furbaby_name: "Pip", furbaby_count: 1, furbaby_breeds: ["beagle"], furbaby_sexes: ["male"], created_at: "2026-06-01", event_id: OLD },
  ];
  const [s] = pastPeopleSuggestions({ query: "jo", registrations, now: NOW });
  assert.deepEqual(s.furbabies, [{ name: "Pip", breed: "beagle", sex: "male", age: "" }]);
});

test("too short a query, or rows without an email, give nothing", () => {
  assert.deepEqual(pastPeopleSuggestions({ query: "a", registrations: [{ name: "Al", email: "a@x.test" }] }), []);
  assert.deepEqual(pastPeopleSuggestions({ query: "al", registrations: [{ name: "Al", email: "" }] }), []);
});
