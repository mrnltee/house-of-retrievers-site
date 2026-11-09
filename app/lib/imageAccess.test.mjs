import { test } from "node:test";
import assert from "node:assert/strict";
import { imageAccess } from "./imageAccess.mjs";

test("public pictures are cached by everyone", () => {
  for (const isAdmin of [false, true]) {
    const access = imageAccess({ isPrivate: false, isAdmin });
    assert.equal(access.ok, true);
    assert.match(access.cache, /^public, .*immutable/);
  }
});

test("private pictures only reach a signed-in admin, never a shared cache", () => {
  assert.deepEqual(imageAccess({ isPrivate: true, isAdmin: false }), { ok: false });
  const access = imageAccess({ isPrivate: true, isAdmin: true });
  assert.equal(access.ok, true);
  assert.match(access.cache, /^private\b/);
  assert.doesNotMatch(access.cache, /public|s-maxage|immutable/);
});
