import { test } from "node:test";
import assert from "node:assert/strict";
import { chatBubbleHidden, shouldChime, liftAbove, chatButtonLabel, CHAT_POLL, shouldPoll } from "./chatBubble.mjs";

test("hidden on the chat page and the check-in display screen only", () => {
  assert.equal(chatBubbleHidden("/chat"), true);
  assert.equal(chatBubbleHidden("/admin/chat/"), true);
  assert.equal(chatBubbleHidden("/admin/chat/archive"), true);
  assert.equal(chatBubbleHidden("/checkin/12/display"), true);
  assert.equal(chatBubbleHidden("/admin/checkin/12/display/"), true);
  assert.equal(chatBubbleHidden("/checkin/12"), false);
  assert.equal(chatBubbleHidden("/events/4/brands"), false);
  assert.equal(chatBubbleHidden("/admin"), false);
  assert.equal(chatBubbleHidden("/people/chatterbox"), false);
});

test("chimes only for a newer message from someone else, never on first look or when muted", () => {
  assert.equal(shouldChime({ lastOther: 10, heard: 0 }), false);
  assert.equal(shouldChime({ lastOther: 10, heard: 10 }), false);
  assert.equal(shouldChime({ lastOther: 9, heard: 10 }), false);
  assert.equal(shouldChime({ lastOther: 11, heard: 10 }), true);
  assert.equal(shouldChime({ lastOther: 11, heard: 10, muted: true }), false);
});

test("lifts above a bar stuck to the bottom under the button", () => {
  const vp = { viewportHeight: 800, buttonLeft: 1200 };
  assert.equal(liftAbove([], vp), 0);
  assert.equal(liftAbove([{ top: 730, bottom: 800, left: 300, right: 1260 }], vp), 82);
  // Not stuck at the bottom (still mid-page).
  assert.equal(liftAbove([{ top: 400, bottom: 470, left: 300, right: 1260 }], vp), 0);
  // Below the screen.
  assert.equal(liftAbove([{ top: 900, bottom: 970, left: 300, right: 1260 }], vp), 0);
  // Ends left of the button.
  assert.equal(liftAbove([{ top: 730, bottom: 800, left: 300, right: 1100 }], vp), 0);
  // The tallest bar wins.
  assert.equal(liftAbove([{ top: 740, bottom: 800, left: 0, right: 1300 }, { top: 700, bottom: 800, left: 0, right: 1300 }], vp), 112);
});

test("button label says what it does and how many are unread", () => {
  assert.equal(chatButtonLabel(0), "Open team chat");
  assert.equal(chatButtonLabel(1), "Team chat, 1 unread message");
  assert.equal(chatButtonLabel(4), "Team chat, 4 unread messages");
  assert.equal(chatButtonLabel(4, true), "Close team chat");
});

test("asks the server only while the tab is visible and the admin isn't away", () => {
  const now = 1_000_000_000;
  const idle = CHAT_POLL.idleAfterMs;
  assert.equal(shouldPoll({ visible: true, lastActiveAt: now, now }), true);
  assert.equal(shouldPoll({ visible: true, lastActiveAt: now - idle + 1, now }), true);
  assert.equal(shouldPoll({ visible: true, lastActiveAt: now - idle, now }), false);
  assert.equal(shouldPoll({ visible: false, lastActiveAt: now, now }), false);
  assert.equal(shouldPoll({ visible: true, lastActiveAt: undefined, now }), false);
  assert.equal(shouldPoll(), false);
});

test("polls less often than before: 30 s for the button, 10 s for an open room, away after 10 minutes", () => {
  assert.equal(CHAT_POLL.bubbleMs, 30_000);
  assert.equal(CHAT_POLL.roomMs, 10_000);
  assert.equal(CHAT_POLL.idleAfterMs, 600_000);
  assert.ok(Object.isFrozen(CHAT_POLL));
});
