import test from "node:test";
import assert from "node:assert/strict";
import { applicationReceived, firstName, rsvpConfirmed, welcomeMember } from "./emailTemplates.mjs";

test("first names and escaping", () => {
  assert.equal(firstName("  Cybelle Latagan "), "Cybelle");
  assert.equal(firstName(""), "there");
  const mail = applicationReceived({ name: "<b>Eve</b>", kind: "Member" });
  assert.doesNotMatch(mail.html, /<b>Eve<\/b>/);
});

test("application received: per kind, and a plain-text twin", () => {
  const vol = applicationReceived({ name: "Chris Fab", kind: "Volunteer" });
  assert.equal(vol.subject, "Thanks for joining House of Retrievers, Chris");
  assert.match(vol.text, /You don't need a dog to volunteer/);
  assert.doesNotMatch(vol.text, /<[a-z]/);
  assert.equal(applicationReceived({ name: "Chris", kind: "Member", again: true }).subject, "We got your update");
});

test("welcome carries the member number; RSVP the pass link and the event", () => {
  assert.match(welcomeMember({ name: "Loren", memberNo: "HOR-0007" }).html, /HOR-0007/);
  const rsvp = rsvpConfirmed({ name: "Ana", status: "confirmed", passUrl: "https://events.houseofretrieversph.org/r/ABC", event: { title: "Bedazzle Barkdate", date: "2026-10-17", startTime: "13:00", endTime: "16:00", venue: "Wiltlover Café", city: "Pasay" } });
  assert.equal(rsvp.subject, "You're going: Bedazzle Barkdate");
  assert.match(rsvp.html, /https:\/\/events\.houseofretrieversph\.org\/r\/ABC/);
  assert.match(rsvp.text, /Wiltlover Café, Pasay/);
  assert.match(rsvpConfirmed({ name: "Ana", status: "waitlist", passUrl: "x", event: { title: "T", date: "2026-10-17", venue: "V", city: "C" } }).subject, /waitlist/);
});
