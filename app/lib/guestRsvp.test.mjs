import { test } from "node:test";
import assert from "node:assert/strict";
import { compTypeForGuest, nameKey, rsvpChange } from "./guestRsvp.mjs";

test("guests of honor, celebrities and VIP furparents are VIPs; everyone else is a Guest", () => {
  assert.equal(compTypeForGuest({ category: "politician" }), "vip");
  assert.equal(compTypeForGuest({ category: "celebrity" }), "vip");
  assert.equal(compTypeForGuest({ category: "vip" }), "vip");
  assert.equal(compTypeForGuest({ category: "speaker" }), "guest");
  assert.equal(compTypeForGuest({ category: "media", specification: "VIP" }), "vip");
  assert.equal(compTypeForGuest({}), "guest");
});

test("names match whatever the case and spacing", () => {
  assert.equal(nameKey("  Dr.  Paolo   LIM "), nameKey("dr. paolo lim"));
});

test("Coming adds them once: an existing RSVP with the same name is linked, never doubled", () => {
  assert.deepEqual(rsvpChange({ reply: "yes" }), { op: "create" });
  assert.deepEqual(rsvpChange({ reply: "yes", sameName: { id: "r1", status: "confirmed" } }), { op: "link", id: "r1" });
  assert.deepEqual(rsvpChange({ reply: "yes", linked: { id: "r2", status: "confirmed" }, made: true, sameName: { id: "r2" } }), { op: "none", id: "r2" });
  assert.deepEqual(rsvpChange({ reply: "yes", linked: { id: "r3", status: "cancelled" }, made: true }), { op: "restore", id: "r3" });
  assert.deepEqual(rsvpChange({ reply: "yes", linked: { id: "r4", status: "confirmed", deleted_at: "x" }, made: true }), { op: "create" });
});

test("changing the reply away from Coming cancels only an RSVP the tracker made, before check-in", () => {
  assert.deepEqual(rsvpChange({ reply: "no", linked: { id: "r1", status: "confirmed" }, made: true }), { op: "cancel", id: "r1" });
  assert.deepEqual(rsvpChange({ reply: "waiting", linked: { id: "r1", status: "confirmed" }, made: true }), { op: "cancel", id: "r1" });
  assert.deepEqual(rsvpChange({ reply: "no", linked: { id: "r1", status: "confirmed" }, made: false }), { op: "none" }, "their own RSVP stays");
  assert.deepEqual(rsvpChange({ reply: "no", linked: { id: "r1", status: "confirmed", checked_in_at: "t" }, made: true }), { op: "none" }, "they came anyway");
  assert.deepEqual(rsvpChange({ reply: "no" }), { op: "none" });
});

test("an event organizer on the Guest tracker joins the RSVP list as an Organizer", async () => {
  const { compTypeForGuest } = await import("./guestRsvp.mjs");
  assert.equal(compTypeForGuest({ category: "organizer" }), "organizer");
  assert.equal(compTypeForGuest({ category: "speaker", specification: "Keynote Speaker" }), "guest");
});
