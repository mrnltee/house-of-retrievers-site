import { test } from "node:test";
import assert from "node:assert/strict";
import { readSendTo, withSendTo } from "./letterSendTo.mjs";

test("readSendTo keeps valid overrides for the refs being sent", () => {
  const json = JSON.stringify({
    "supporter:a": { email: " maria@brand.ph ", contact: "  Maria   Cruz " },
    "supporter:b": { email: "" },
    "supporter:x": { email: "other@brand.ph" },
  });
  assert.deepEqual(readSendTo(json, ["supporter:a", "supporter:b"]).byRef, { "supporter:a": { email: "maria@brand.ph", contact: "Maria Cruz" } });
});

test("readSendTo refuses a bad address and unreadable JSON", () => {
  assert.match(readSendTo(JSON.stringify({ "supporter:a": { email: "maria at brand" } }), ["supporter:a"]).error, /doesn't look like/);
  assert.match(readSendTo("{nope", ["supporter:a"]).error, /couldn't be read/);
  assert.deepEqual(readSendTo("", ["supporter:a"]).byRef, {});
});

test("withSendTo swaps the email, and the contact and greeting when a name is given", () => {
  const r = { ref: "supporter:a", name: "Brand", contact: "Jessie", salutation: "Ms. Jessie", email: "jessie@brand.ph", cc: [] };
  assert.deepEqual(withSendTo(r, { email: "maria@brand.ph" }), { ...r, email: "maria@brand.ph", onRecord: "jessie@brand.ph" });
  assert.deepEqual(withSendTo(r, { email: "maria@brand.ph", contact: "Maria Cruz" }), { ...r, email: "maria@brand.ph", onRecord: "jessie@brand.ph", contact: "Maria Cruz", salutation: "Maria Cruz" });
  assert.equal(withSendTo(r, null), r);
  assert.equal(withSendTo(r, { email: "bad" }), r);
});
