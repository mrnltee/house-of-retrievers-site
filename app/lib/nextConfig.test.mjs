import { test } from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../../next.config.mjs";

test("responses don't announce the framework (no X-Powered-By)", () => {
  assert.equal(nextConfig.poweredByHeader, false);
});
