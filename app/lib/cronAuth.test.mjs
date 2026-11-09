import { test } from "node:test";
import assert from "node:assert/strict";
import { isCronAuthorized } from "./cronAuth.mjs";

const headers = (value) => new Headers(value === undefined ? {} : { authorization: value });

test("accepts only the exact bearer secret", () => {
  assert.equal(isCronAuthorized(headers("Bearer s3cret"), "s3cret"), true);
  assert.equal(isCronAuthorized(headers("Bearer wrong!"), "s3cret"), false);
  assert.equal(isCronAuthorized(headers("Bearer s3cre"), "s3cret"), false);
  assert.equal(isCronAuthorized(headers("Bearer s3cretX"), "s3cret"), false);
  assert.equal(isCronAuthorized(headers("s3cret"), "s3cret"), false);
  assert.equal(isCronAuthorized(headers(), "s3cret"), false);
});

test("refuses everything when no secret is configured", () => {
  assert.equal(isCronAuthorized(headers("Bearer "), ""), false);
  assert.equal(isCronAuthorized(headers("Bearer undefined"), undefined), false);
  assert.equal(isCronAuthorized(headers(), undefined), false);
});
