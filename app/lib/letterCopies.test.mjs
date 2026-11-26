import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_COPIES, copiesFor, parseCopies } from "./letterCopies.mjs";

test("parseCopies splits on commas, semicolons, spaces and new lines", () => {
  assert.deepEqual(parseCopies("a@x.ph, b@y.com;c@z.org\n d@w.net").emails, ["a@x.ph", "b@y.com", "c@z.org", "d@w.net"]);
  assert.deepEqual(parseCopies("").emails, []);
  assert.deepEqual(parseCopies("  ").emails, []);
  assert.deepEqual(parseCopies("<a@x.ph>").emails, ["a@x.ph"]);
});

test("parseCopies drops repeats (any case) and refuses bad or too many", () => {
  assert.deepEqual(parseCopies("A@x.ph, a@X.ph").emails, ["A@x.ph"]);
  assert.match(parseCopies("a@x.ph, nope", "BCC").error, /^BCC: “nope”/);
  const many = Array.from({ length: MAX_COPIES + 1 }, (_, i) => `p${i}@x.ph`).join(",");
  assert.match(parseCopies(many).error, /at most/);
});

test("copiesFor adds the extras without repeating anyone", () => {
  assert.deepEqual(
    copiesFor({ to: "guest@x.ph", cc: ["rep@x.ph"] }, ["hor@x.ph", "Guest@x.ph"], ["rep@x.ph", "boss@x.ph", "hor@x.ph"]),
    { cc: ["rep@x.ph", "hor@x.ph"], bcc: ["boss@x.ph"] },
  );
  assert.deepEqual(copiesFor({ to: "a@x.ph" }), { cc: [], bcc: [] });
});

test("splitCopyDraft turns each finished address into a chip and keeps the draft", async () => {
  const { splitCopyDraft, isCopyEmail } = await import("./letterCopies.mjs");
  assert.deepEqual(splitCopyDraft([], "ana@x.ph"), { chips: [], draft: "ana@x.ph" });
  assert.deepEqual(splitCopyDraft([], "ana@x.ph,"), { chips: ["ana@x.ph"], draft: "" });
  assert.deepEqual(splitCopyDraft(["ana@x.ph"], "ben@y.com; cy@z.org, d"), { chips: ["ana@x.ph", "ben@y.com", "cy@z.org"], draft: "d" });
  assert.deepEqual(splitCopyDraft(["ana@x.ph"], "ANA@x.ph, <ben@y.com>\n"), { chips: ["ana@x.ph", "ben@y.com"], draft: "" });
  assert.deepEqual(splitCopyDraft([], " , ,"), { chips: [], draft: "" });
  assert.equal(isCopyEmail("ana@x.ph"), true);
  assert.equal(isCopyEmail("ana@"), false);
});
