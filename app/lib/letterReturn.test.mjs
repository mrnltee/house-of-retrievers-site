import test from "node:test";
import assert from "node:assert/strict";
import { safeReturn } from "./letterReturn.mjs";

test("the send window returns only to a same-site admin path", () => {
  assert.equal(safeReturn("/registrations/abc"), "/registrations/abc");
  assert.equal(safeReturn("/guests?category=celebrity&ok=Sent"), "/guests?category=celebrity");
  assert.equal(safeReturn("/guests?error=x"), "/guests");
  assert.equal(safeReturn("https://evil.test/x"), "");
  assert.equal(safeReturn("//evil.test/x"), "");
  assert.equal(safeReturn("/\\evil.test"), "");
  assert.equal(safeReturn("/x?next=https://evil.test"), "");
  assert.equal(safeReturn(""), "");
  assert.equal(safeReturn("guests"), "");
});
