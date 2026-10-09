import test from "node:test";
import assert from "node:assert/strict";
import { EVENTS_URL, isEventsHost, normalizeHost, routeEventsRequest } from "./eventsHost.mjs";

test("normalizes hosts with ports and capitals", () => {
  assert.equal(normalizeHost("Events.HouseOfRetrieversPH.org:443"), "events.houseofretrieversph.org");
  assert.equal(normalizeHost(undefined), "");
});

test("recognizes the events subdomain and its local stand-in", () => {
  assert.equal(isEventsHost("events.houseofretrieversph.org"), true);
  assert.equal(isEventsHost("events.localhost:3000"), true);
  assert.equal(isEventsHost("www.houseofretrieversph.org"), false);
});

test("serves the events pages at the root of the subdomain", () => {
  assert.deepEqual(routeEventsRequest("events.houseofretrieversph.org", "/"), { type: "rewrite", pathname: "/events" });
  assert.deepEqual(routeEventsRequest("events.houseofretrieversph.org", "/weekend-run"), { type: "rewrite", pathname: "/events/weekend-run" });
});

test("keeps one address per page on the subdomain", () => {
  assert.deepEqual(routeEventsRequest("events.houseofretrieversph.org", "/events"), { type: "redirect", url: "/" });
  assert.deepEqual(routeEventsRequest("events.houseofretrieversph.org", "/events/weekend-run", "?ref=ig"), { type: "redirect", url: "/weekend-run?ref=ig" });
});

test("sends /events on the main site to the subdomain", () => {
  assert.deepEqual(routeEventsRequest("www.houseofretrieversph.org", "/events"), { type: "redirect", url: `${EVENTS_URL}/` });
  assert.deepEqual(routeEventsRequest("houseofretrieversph.org", "/events/weekend-run"), { type: "redirect", url: `${EVENTS_URL}/weekend-run` });
});

test("leaves the main site, previews and look-alike paths alone", () => {
  assert.deepEqual(routeEventsRequest("www.houseofretrieversph.org", "/"), { type: "next" });
  assert.deepEqual(routeEventsRequest("www.houseofretrieversph.org", "/eventsx"), { type: "next" });
  assert.deepEqual(routeEventsRequest("hor-git-feat.vercel.app", "/events"), { type: "next" });
  assert.deepEqual(routeEventsRequest("localhost:3000", "/events"), { type: "next" });
});
