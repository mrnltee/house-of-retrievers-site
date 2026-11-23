import { test } from "node:test";
import assert from "node:assert/strict";
import { chatBubbleHidden, shouldChime, liftAbove, chatButtonLabel } from "./chatBubble.mjs";

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
