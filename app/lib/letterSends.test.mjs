import { test } from "node:test";
import assert from "node:assert/strict";
import { settled, statusFromEvent, statusLabel, statusTone } from "./letterSends.mjs";

test("Resend events map to letter statuses", () => {
  assert.equal(statusFromEvent("delivered"), "delivered");
  assert.equal(statusFromEvent("email.bounced"), "bounced");
  assert.equal(statusFromEvent("delivery_delayed"), "delayed");
  assert.equal(statusFromEvent("queued"), "sent");
  assert.equal(statusFromEvent("canceled"), "failed");
  assert.equal(statusFromEvent(null), "");
  assert.equal(statusLabel("complained"), "Marked as spam");
  assert.equal(statusTone("bounced"), "alert");
  assert.equal(statusTone("delivered"), "good");
  assert.equal(settled("bounced"), true);
  assert.equal(settled("delivered"), false);
});
