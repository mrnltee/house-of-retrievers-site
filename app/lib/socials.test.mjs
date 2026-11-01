import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSocials, socialLinks } from "./socials.mjs";

test("a handle or a profile link becomes the profile link", () => {
  const { values } = cleanSocials({ facebook: "facebook.com/PawssionProject", tiktok: "@hor.ph", x: "https://twitter.com/hor_ph?s=21", threads: "@hor.ph" });
  assert.deepEqual(values, {
    facebook: "https://www.facebook.com/PawssionProject",
    tiktok: "https://www.tiktok.com/@hor.ph",
    x: "https://x.com/hor_ph",
    threads: "https://www.threads.net/@hor.ph",
  });
  assert.equal(cleanSocials({ facebook: "https://www.facebook.com/profile.php?id=61594865916160" }).values.facebook, "https://www.facebook.com/profile.php?id=61594865916160");
  assert.equal(cleanSocials({ x: "https://x.com/hor_ph" }).values.x, "https://x.com/hor_ph");
  assert.equal(cleanSocials({ threads: "https://www.threads.com/@hor.ph" }).values.threads, "https://www.threads.net/@hor.ph");
  assert.deepEqual(cleanSocials({}).values, { facebook: null, tiktok: null, x: null, threads: null });
});

test("a link to the wrong site, or a messy handle, is refused with the network's name", () => {
  assert.match(cleanSocials({ tiktok: "https://instagram.com/hor" }).error, /TikTok/);
  assert.match(cleanSocials({ x: "two words" }).error, /X/);
});

test("the website shows links in a fixed order: Instagram, Facebook, TikTok, X, Threads, Website", () => {
  assert.deepEqual(socialLinks({ website: "https://w.ph", x: "https://x.com/a", instagram: "https://www.instagram.com/a/" }).map((l) => l.label), ["Instagram", "X", "Website"]);
  assert.deepEqual(socialLinks({}), []);
});
