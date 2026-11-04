import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPhotographer, PHOTOGRAPHER_LIMITS } from "./photographers.mjs";

test("a photographer record is tidied: name needed, links made whole", () => {
  const { photographer: p } = cleanPhotographer({ name: "  Juan  dela Cruz ", bio: " Shoots dogs. ", website: "juanshoots.com", instagram: "@juan.shoots", showOnSite: "on" });
  assert.equal(p.name, "Juan dela Cruz");
  assert.equal(p.bio, "Shoots dogs.");
  assert.equal(p.website, "https://juanshoots.com");
  assert.equal(p.instagram, "https://www.instagram.com/juan.shoots");
  assert.equal(p.showOnSite, true);
  assert.equal(cleanPhotographer({ name: "A", instagram: "https://instagram.com/abc/" }).photographer.instagram, "https://www.instagram.com/abc");
  assert.equal(cleanPhotographer({ name: "A", website: "" }).photographer.website, null);
});

test("bad input gets a plain message", () => {
  assert.match(cleanPhotographer({ name: "" }).error, /name/i);
  assert.match(cleanPhotographer({ name: "A", website: "javascript:alert(1)" }).error, /portfolio/i);
  assert.match(cleanPhotographer({ name: "A", instagram: "https://evil.example/x" }).error, /Instagram/);
  assert.match(cleanPhotographer({ name: "A", bio: "x".repeat(PHOTOGRAPHER_LIMITS.bio + 1) }).error, /bio/i);
  assert.match(cleanPhotographer({ name: "A", showOnSite: "on" }).error, /photo|bio/i, "showing on the site needs a bio");
});
