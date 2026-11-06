import test from "node:test";
import assert from "node:assert/strict";
import { toPublicEvent, validateEvent } from "./events.mjs";

const base = { title: "Playdate", date: "2026-11-08", category: "Socials & runs", venue: "Parklinks", city: "Quezon City", summary: "Fun" };

test("a playdate is never a charity event and has no beneficiary", () => {
  const { value } = validateEvent({ ...base, eventType: "playdate", isCharity: "on", supports: "Some shelter" });
  assert.equal(value.eventType, "playdate");
  assert.equal(value.isCharity, false);
  assert.equal(value.supports, null);
});

test("a monthly playdate lands on the last Sunday of its month", () => {
  const { value } = validateEvent({ ...base, eventType: "monthly_playdate" }, { today: "2026-11-01" });
  assert.equal(value.date, "2026-11-29");
});

test("an unknown or missing type is a standard event and keeps its date and charity switch", () => {
  const { value } = validateEvent({ ...base, isCharity: "on", supports: "Shelter" });
  assert.equal(value.eventType, "standard");
  assert.equal(value.isCharity, true);
  assert.equal(value.date, "2026-11-08");
});
