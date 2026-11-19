import { test } from "node:test";
import assert from "node:assert/strict";
import { HOR_INBOX, horCopyAddress, withHorCopy } from "./horCopy.mjs";

test("HoR's inbox is copied in on every email, once", () => {
  assert.deepEqual(withHorCopy({ to: "guest@example.com" }, HOR_INBOX), { cc: [HOR_INBOX], bcc: [] });
  assert.deepEqual(withHorCopy({ to: "guest@example.com", cc: ["rep@example.com"] }, HOR_INBOX), { cc: ["rep@example.com", HOR_INBOX], bcc: [] });
});

test("not added when the email already goes to HoR, or it's already copied", () => {
  assert.deepEqual(withHorCopy({ to: "HouseOfRetrieversPH@gmail.com" }, HOR_INBOX), { cc: [], bcc: [] });
  assert.deepEqual(withHorCopy({ to: "a@example.com", cc: [HOR_INBOX] }, HOR_INBOX), { cc: [HOR_INBOX], bcc: [] });
});

test("a BCC to the same inbox becomes the CC instead of a second copy", () => {
  assert.deepEqual(withHorCopy({ to: "a@example.com", bcc: [HOR_INBOX, "x@example.com"] }, HOR_INBOX), { cc: [HOR_INBOX], bcc: ["x@example.com"] });
});

test("the address can be changed or switched off", () => {
  assert.equal(horCopyAddress({}), HOR_INBOX);
  assert.equal(horCopyAddress({ EMAIL_COPY_TO: "records@example.com" }), "records@example.com");
  assert.equal(horCopyAddress({ EMAIL_COPY_TO: "off" }), "");
  assert.deepEqual(withHorCopy({ to: "a@example.com" }, ""), { cc: [], bcc: [] });
});
