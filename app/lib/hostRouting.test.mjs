import test from "node:test";
import assert from "node:assert/strict";
import { routePageRequest } from "./hostRouting.mjs";

test("keeps admin and events host routing unchanged", () => {
  assert.deepEqual(routePageRequest("admin.houseofretrieversph.org", "/events"), {
    type: "rewrite",
    pathname: "/admin/events",
  });
  assert.deepEqual(routePageRequest("events.houseofretrieversph.org", "/weekend-run"), {
    type: "rewrite",
    pathname: "/events/weekend-run",
  });
});

test("serves the media hub at its subdomain root", () => {
  assert.deepEqual(routePageRequest("media.houseofretrieversph.org", "/"), {
    type: "rewrite",
    pathname: "/media",
  });
  assert.deepEqual(routePageRequest("media.localhost", "/downloads"), { type: "next" });
});

test("leaves the main site and previews alone after countdown cleanup", () => {
  assert.deepEqual(routePageRequest("www.houseofretrieversph.org", "/"), { type: "next" });
  assert.deepEqual(routePageRequest("house-of-retrievers-site-git-x.vercel.app", "/countdown"), { type: "next" });
});

test("sends the retired countdown host permanently to the main site", () => {
  assert.deepEqual(routePageRequest("countdown.houseofretrieversph.org", "/anything", "?ref=old"), {
    type: "redirect",
    url: "https://www.houseofretrieversph.org/",
  });
});
