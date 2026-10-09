import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_URL, adminPath, isAdminHost, routeAdminRequest } from "./adminHost.mjs";

test("recognizes the admin subdomain and its local stand-in", () => {
  assert.equal(isAdminHost("admin.houseofretrieversph.org"), true);
  assert.equal(isAdminHost("Admin.localhost:3000"), true);
  assert.equal(isAdminHost("www.houseofretrieversph.org"), false);
});

test("serves the admin at the root of its subdomain, one address per page", () => {
  assert.deepEqual(routeAdminRequest("admin.houseofretrieversph.org", "/"), { type: "rewrite", pathname: "/admin" });
  assert.deepEqual(routeAdminRequest("admin.houseofretrieversph.org", "/payments"), { type: "rewrite", pathname: "/admin/payments" });
  assert.deepEqual(routeAdminRequest("admin.houseofretrieversph.org", "/admin/payments", "?x=1"), { type: "redirect", url: "/payments?x=1" });
});

test("sends /admin on the public hosts to the admin subdomain", () => {
  assert.deepEqual(routeAdminRequest("www.houseofretrieversph.org", "/admin"), { type: "redirect", url: `${ADMIN_URL}/` });
  assert.deepEqual(routeAdminRequest("events.houseofretrieversph.org", "/admin/events"), { type: "redirect", url: `${ADMIN_URL}/events` });
});

test("leaves previews, localhost and look-alike paths alone", () => {
  assert.deepEqual(routeAdminRequest("hor-git-feat.vercel.app", "/admin"), { type: "next" });
  assert.deepEqual(routeAdminRequest("localhost:3000", "/admin/events"), { type: "next" });
  assert.deepEqual(routeAdminRequest("www.houseofretrieversph.org", "/administer"), { type: "next" });
});

test("builds links that match the address bar", () => {
  assert.equal(adminPath("admin.houseofretrieversph.org", "/events"), "/events");
  assert.equal(adminPath("localhost:3000", "/events"), "/admin/events");
  assert.equal(adminPath("localhost:3000", "/"), "/admin");
});
