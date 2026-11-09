import { test } from "node:test";
import assert from "node:assert/strict";
import { contentSecurityPolicy, summarizeCspReport } from "./contentSecurityPolicy.mjs";

const directive = (policy, name) => policy.split("; ").find((part) => part.startsWith(`${name} `)) || "";

test("locks down plugins, base, forms and framing", () => {
  const policy = contentSecurityPolicy();
  assert.equal(directive(policy, "object-src"), "object-src 'none'");
  assert.equal(directive(policy, "base-uri"), "base-uri 'self'");
  assert.equal(directive(policy, "form-action"), "form-action 'self'");
  assert.equal(directive(policy, "frame-ancestors"), "frame-ancestors 'self'");
  assert.match(policy, /report-uri \/api\/csp-report$/);
});

test("allows what the site really loads", () => {
  const policy = contentSecurityPolicy();
  assert.match(directive(policy, "script-src"), /https:\/\/www\.googletagmanager\.com/);
  assert.match(directive(policy, "media-src"), /https:\/\/res\.cloudinary\.com/);
  assert.match(directive(policy, "img-src"), /cdninstagram\.com/);
  assert.match(directive(policy, "connect-src"), /https:\/\/api\.cloudinary\.com/);
  assert.match(directive(policy, "frame-src"), /https:\/\/www\.openstreetmap\.org/);
});

test("eval only in development", () => {
  assert.doesNotMatch(contentSecurityPolicy(), /unsafe-eval/);
  assert.match(contentSecurityPolicy({ dev: true }), /unsafe-eval/);
});

test("reports are trimmed and lose query strings", () => {
  const legacy = { "csp-report": { "effective-directive": "script-src-elem", "blocked-uri": "https://evil.test/x.js?k=1", "document-uri": "https://events.houseofretrieversph.org/r/ABCDEFGHJK?x=1" } };
  assert.deepEqual(summarizeCspReport(legacy), { directive: "script-src-elem", blocked: "https://evil.test/x.js", page: "https://events.houseofretrieversph.org/r/ABCDEFGHJK" });
  const modern = [{ type: "csp-violation", body: { effectiveDirective: "img-src", blockedURL: "https://x.test/a.png", documentURL: "https://www.houseofretrieversph.org/" } }];
  assert.deepEqual(summarizeCspReport(modern), { directive: "img-src", blocked: "https://x.test/a.png", page: "https://www.houseofretrieversph.org/" });
  assert.deepEqual(summarizeCspReport(null), { directive: "", blocked: "", page: "" });
});
