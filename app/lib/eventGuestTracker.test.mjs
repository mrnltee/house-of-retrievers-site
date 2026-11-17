import test from "node:test";
import assert from "node:assert/strict";
import { GUEST_FOLLOW_UP_LETTER, guestFollowUpLink, guestInviteLetter, guestMessageBase, guestRowLinks } from "./eventGuestTracker.mjs";
import { LETTER_STARTERS } from "./letters/starters.mjs";

const q = (href) => new URLSearchParams(href.split("?")[1]);

test("the guest follow-up is a built-in, email-only letter", () => {
  const starter = LETTER_STARTERS.find((l) => l.key === GUEST_FOLLOW_UP_LETTER);
  assert.ok(starter);
  assert.equal(starter.attachPdf, false);
});

test("invite uses the event's own letter, else the guest's category letter", () => {
  assert.equal(guestInviteLetter({ category: "speaker" }, { eventLetter: "ev-launch-1234" }), "ev-launch-1234");
  assert.equal(guestInviteLetter({ category: "speaker" }), "invite-guest-speaker");
});

test("row links: invite always, follow up only after an invite while waiting, message opens own email", () => {
  const row = { id: "c1", reply: "waiting" };
  const before = guestRowLinks("/admin", "e1", row, "invite-guest-speaker");
  assert.equal(q(before.invite).get("letter"), "invite-guest-speaker");
  assert.deepEqual(q(before.invite).getAll("to"), ["contact:c1"]);
  assert.equal(q(before.invite).get("list"), "guests");
  assert.equal(before.followUp, "");
  assert.equal(q(before.message).get("own"), "1");
  const after = guestRowLinks("/admin", "e1", row, "invite-guest-speaker", { sent: true });
  assert.equal(q(after.followUp).get("letter"), GUEST_FOLLOW_UP_LETTER);
  assert.equal(guestRowLinks("/admin", "e1", { id: "c1", reply: "yes" }, "x", { sent: true }).followUp, "");
});

test("Follow up · N takes waiting guests who already had an invite", () => {
  const rows = [{ id: "a", reply: "waiting", email: "a@x.test" }, { id: "b", reply: "waiting" }, { id: "c", reply: "yes" }, { id: "d", reply: "waiting" }];
  const link = guestFollowUpLink("/admin", "e1", rows, (r) => r.id !== "d");
  assert.equal(link.count, 2);
  assert.equal(link.noEmail, 1);
  assert.deepEqual(q(link.href).getAll("to"), ["contact:a", "contact:b"]);
  assert.equal(guestFollowUpLink("/admin", "e1", [{ id: "c", reply: "yes" }]).href, "");
  assert.equal(q(guestMessageBase("/admin", "e1")).get("own"), "1");
});
