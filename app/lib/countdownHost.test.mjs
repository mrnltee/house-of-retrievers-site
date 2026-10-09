import test from "node:test";
import assert from "node:assert/strict";
import { LAUNCH_AT, routeCountdownRequest } from "./countdownHost.mjs";

const before = LAUNCH_AT - 60000;
const after = LAUNCH_AT + 1000;
const www = "www.houseofretrieversph.org";

test("main site goes to the countdown before launch, and stays put after", () => {
  assert.deepEqual(routeCountdownRequest({ host: www, pathname: "/", now: before }), { type: "redirect", url: "https://countdown.houseofretrieversph.org/" });
  assert.deepEqual(routeCountdownRequest({ host: "houseofretrieversph.org", pathname: "/x", now: before }).type, "redirect");
  assert.deepEqual(routeCountdownRequest({ host: www, pathname: "/", now: after }), { type: "next" });
});

test("countdown host renders the countdown, then sends people to the site", () => {
  assert.deepEqual(routeCountdownRequest({ host: "countdown.houseofretrieversph.org", pathname: "/", now: before }), { type: "rewrite", pathname: "/countdown" });
  assert.deepEqual(routeCountdownRequest({ host: "countdown.houseofretrieversph.org", pathname: "/", now: after }), { type: "redirect", url: "https://www.houseofretrieversph.org/" });
});

test("only the secret preview link or its cookie gets in early", () => {
  const key = "k3y";
  assert.equal(routeCountdownRequest({ host: www, pathname: "/", search: "?preview=1", now: before, previewKey: key }).type, "redirect");
  assert.equal(routeCountdownRequest({ host: www, pathname: "/", search: "?preview=k3y", now: before, previewKey: "" }).type, "redirect");
  assert.deepEqual(routeCountdownRequest({ host: www, pathname: "/", search: "?preview=k3y&a=1", now: before, previewKey: key }), { type: "preview", value: true, url: "/?a=1" });
  assert.equal(routeCountdownRequest({ host: www, pathname: "/", now: before, preview: true, previewKey: key }).type, "next");
});

test("other hosts are untouched", () => {
  assert.equal(routeCountdownRequest({ host: "events.houseofretrieversph.org", pathname: "/", now: before }).type, "next");
  assert.equal(routeCountdownRequest({ host: "house-of-retrievers-site-git-x.vercel.app", pathname: "/", now: before }).type, "next");
});
