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

test("a new member gets HOR's welcome; a repeat gets the short note", () => {
  const first = applicationReceived({ name: "Sheryl Luteria", kind: "Member" });
  assert.equal(first.subject, "Welcome to the House, Sheryl! 🤎");
  assert.match(first.text, /^Hi Sheryl,/);
  assert.match(first.text, /every paw has a purpose/);
  assert.match(first.text, /With love and purpose,/);
  assert.match(first.html, /email\/header-center\.png/);
  assert.match(first.html, /email\/badge\.png/);
  assert.doesNotMatch(first.text, /<[a-z]/);
  assert.doesNotMatch(applicationReceived({ name: "Sheryl", kind: "Member", again: true }).text, /every paw has a purpose/);
});

test("every email uses the house style: centered logo and HOR's sign-off", () => {
  for (const mail of [welcomeMember({ name: "Loren" }), applicationReceived({ name: "Chris", kind: "Volunteer" })]) {
    assert.match(mail.html, /email\/header-center\.png/);
    assert.match(mail.text, /With love and purpose,/);
    assert.match(mail.text, /Reply to this email to reach the team/);
  }
});

test("welcome carries the member number; RSVP the pass link and the event", () => {
  assert.match(welcomeMember({ name: "Loren", memberNo: "HOR-0007" }).html, /HOR-0007/);
  const rsvp = rsvpConfirmed({ name: "Ana", status: "confirmed", passUrl: "https://events.houseofretrieversph.org/r/ABC", event: { title: "Bedazzle Barkdate", date: "2026-10-17", startTime: "13:00", endTime: "16:00", venue: "Wiltlover Café", city: "Pasay" } });
  assert.equal(rsvp.subject, "You're going: Bedazzle Barkdate");
  assert.match(rsvp.html, /https:\/\/events\.houseofretrieversph\.org\/r\/ABC/);
  assert.match(rsvp.text, /Wiltlover Café, Pasay/);
  assert.match(rsvpConfirmed({ name: "Ana", status: "waitlist", passUrl: "x", event: { title: "T", date: "2026-10-17", venue: "V", city: "C" } }).subject, /waitlist/);
});

test("editable welcome emails: HOR's wording with variables, safely filled", async () => {
  const { renderTemplate, unknownVariables } = await import("./emailTemplates.mjs");
  const mail = renderTemplate("member-welcome", { subject: "Hi {{ first_name }}!", heading: "Welcome, {{full_name}}", message: "Your number: **{{member_no}}**\nwith {{furbaby_name}}\n\nSecond paragraph" }, { name: "Ana <b>Cruz</b>", memberNo: "HOR-26-0007", furbaby: "Mochi" });
  assert.equal(mail.subject, "Hi Ana!");
  assert.match(mail.html, /<strong style="white-space:nowrap">HOR-26-0007<\/strong><br>with Mochi/);
  assert.doesNotMatch(mail.html, /<b>Cruz/);
  assert.match(mail.text, /Second paragraph/);
  assert.deepEqual(unknownVariables("member-registered", { message: "{{first_name}} {{member_no}} {{oops}}" }), ["member_no", "oops"]);
  const fallback = renderTemplate("member-registered", { heading: "  ", message: "Hello" }, { name: "Juan" });
  assert.equal(fallback.subject, "Welcome to the House, Juan! 🤎");
});
