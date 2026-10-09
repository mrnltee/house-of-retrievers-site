import test from "node:test";
import assert from "node:assert/strict";
import { checkFillTime, clientIp, createRateLimiter, isHoneypotTripped } from "./spamGuard.mjs";

test("the honeypot trips only when something was typed into it", () => {
  assert.equal(isHoneypotTripped(""), false);
  assert.equal(isHoneypotTripped("   "), false);
  assert.equal(isHoneypotTripped(undefined), false);
  assert.equal(isHoneypotTripped("https://spam.example"), true);
});

test("fill time separates people, scripts and stale pages", () => {
  assert.equal(checkFillTime(12000), "ok");
  assert.equal(checkFillTime("4500"), "ok");
  assert.equal(checkFillTime(800), "too-fast");
  assert.equal(checkFillTime(undefined), "missing");
  assert.equal(checkFillTime("soon"), "missing");
});

test("reads the visitor address from proxy headers", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientIp(new Headers({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(clientIp(new Headers()), "unknown");
});

test("allows a few submissions per window, then asks the visitor to wait", () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
  const t = 1_000_000;
  assert.equal(limiter.hit("a", t).allowed, true);
  assert.equal(limiter.hit("a", t + 1).allowed, true);
  assert.equal(limiter.hit("a", t + 2).allowed, true);
  const blocked = limiter.hit("a", t + 3);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);
  assert.equal(limiter.hit("b", t + 3).allowed, true, "other visitors are unaffected");
  assert.equal(limiter.hit("a", t + 60_000).allowed, true, "a new window starts fresh");
});
