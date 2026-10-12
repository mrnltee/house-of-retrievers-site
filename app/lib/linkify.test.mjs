import test from "node:test";
import assert from "node:assert/strict";
import { linkify } from "./linkify.mjs";

test("links in event text become clickable pieces", () => {
  const parts = linkify("Register at https://forms.gle/abc123. Questions? hello@houseofretrieversph.org or fb.me/horph (page).");
  const links = parts.filter((p) => typeof p !== "string");
  assert.deepEqual(links.map((l) => l.href), ["https://forms.gle/abc123", "mailto:hello@houseofretrieversph.org", "https://fb.me/horph"]);
  assert.equal(parts.map((p) => (typeof p === "string" ? p : p.text)).join(""), "Register at https://forms.gle/abc123. Questions? hello@houseofretrieversph.org or fb.me/horph (page).");
  assert.equal(linkify("www.example.com/x)")[0].href, "https://www.example.com/x");
  assert.deepEqual(linkify("no links here, just 6:00 AM."), ["no links here, just 6:00 AM."]);
});
