import test from "node:test";
import assert from "node:assert/strict";
import { cleanSpeaker, cleanSpeakerLink, isPublicSpeaker, linkLabel, publicSpeaker, sortSpeakers, speakersTitle } from "./eventSpeakers.mjs";

test("only switched-on guests who replied Coming are public", () => {
  assert.equal(isPublicSpeaker({ name: "Ana", reply: "yes", show_on_site: true }), true);
  assert.equal(isPublicSpeaker({ name: "Ana", reply: "waiting", show_on_site: true }), false);
  assert.equal(isPublicSpeaker({ name: "Ana", reply: "no", show_on_site: true }), false);
  assert.equal(isPublicSpeaker({ name: "Ana", reply: "yes", show_on_site: false }), false);
  assert.equal(isPublicSpeaker({ name: " ", reply: "yes", show_on_site: true }), false);
});

test("links: https or an Instagram handle only", () => {
  assert.equal(cleanSpeakerLink("@buddy.zubiri"), "https://www.instagram.com/buddy.zubiri/");
  assert.equal(cleanSpeakerLink("https://example.org/about"), "https://example.org/about");
  assert.equal(cleanSpeakerLink("http://example.org"), "");
  assert.equal(cleanSpeakerLink("javascript:alert(1)"), "");
  assert.equal(cleanSpeakerLink("not a link"), "");
  assert.equal(linkLabel("https://www.instagram.com/x/"), "Instagram");
  assert.equal(linkLabel("https://example.org"), "Website");
});

test("form values are tidied and capped", () => {
  const s = cleanSpeaker({ show: "1", role: "  Guest   speaker ", intro: "x".repeat(300), link: "@hor" });
  assert.equal(s.show, true);
  assert.equal(s.role, "Guest speaker");
  assert.equal(s.intro.length, 200);
  assert.equal(s.link, "https://www.instagram.com/hor/");
  assert.equal(cleanSpeaker({}).show, false);
});

test("the public shape never carries contact details or a private photo path", () => {
  const p = publicSpeaker({ contact_id: "c1", name: "Ana Cruz", email: "a@b.c", phone: "0917", notes: "x", photo: "/api/event-image/11111111-1111-1111-1111-111111111111", public_role: "", public_photo: "https://evil.example/x.png" });
  assert.deepEqual(Object.keys(p).sort(), ["id", "intro", "link", "linkLabel", "name", "photo", "role"]);
  assert.equal(p.role, "Special guest");
  assert.equal(p.photo, null);
});

test("speakers come before special guests, and the title follows who is there", () => {
  const list = sortSpeakers([{ name: "Zed", role: "Special guest" }, { name: "Amy", role: "Host" }, { name: "Bo", role: "Keynote speaker" }]);
  assert.deepEqual(list.map((s) => s.name), ["Bo", "Amy", "Zed"]);
  assert.equal(speakersTitle(list), "Speakers & special guests");
  assert.equal(speakersTitle([{ role: "Guest speaker" }]), "Speaker");
  assert.equal(speakersTitle([{ role: "Special guest" }, { role: "VIP" }]), "Special guests");
});
