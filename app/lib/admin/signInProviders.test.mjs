import test from "node:test";
import assert from "node:assert/strict";
import { yahooProvider, verifiedEmail } from "./signInProviders.mjs";

test("Yahoo sign-in exists only when both keys are set", () => {
  assert.equal(yahooProvider({}), null);
  assert.equal(yahooProvider({ YAHOO_CLIENT_ID: "id" }), null);
  const p = yahooProvider({ YAHOO_CLIENT_ID: "id", YAHOO_CLIENT_SECRET: "secret" });
  assert.equal(p.id, "yahoo");
  assert.equal(p.type, "oauth");
  assert.equal(p.wellKnown, "https://api.login.yahoo.com/.well-known/openid-configuration");
  assert.equal(p.idToken, true);
  assert.equal(p.authorization.params.scope, "openid email profile");
  assert.equal(p.clientId, "id");
  assert.deepEqual(p.profile({ sub: "abc", email: "Pat@Yahoo.com", name: "Pat", picture: "https://x/p.jpg" }), { id: "abc", email: "pat@yahoo.com", name: "Pat", image: "https://x/p.jpg" });
  assert.equal(p.profile({ sub: "abc", email: "p@yahoo.com", nickname: "pat" }).name, "pat");
});

test("Google and Yahoo accounts need a verified email; other sign-ins aren't checked here", () => {
  assert.equal(verifiedEmail("google", { email_verified: true }), true);
  assert.equal(verifiedEmail("google", { email_verified: false }), false);
  assert.equal(verifiedEmail("yahoo", { email_verified: true }), true);
  assert.equal(verifiedEmail("yahoo", {}), false, "missing claim fails closed");
  assert.equal(verifiedEmail("yahoo", { email_verified: "true" }), false, "only a real true counts");
  assert.equal(verifiedEmail("dev", undefined), true);
});
