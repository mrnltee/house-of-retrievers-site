import test from "node:test";
import assert from "node:assert/strict";
import { cleanTiers, formatPeso, parsePeso, priceSummary, tiersFromCost } from "./prices.mjs";
import { cleanGallery, cleanIncluded, cleanUploaders, isPlaceholder, toPublicEvent, validateEvent } from "./admin/events.mjs";

test("pesos read and print the way people type them", () => {
  assert.equal(parsePeso("₱1,200"), 1200);
  assert.equal(parsePeso("PHP 795"), 795);
  assert.equal(parsePeso("99.50"), 99.5);
  assert.equal(parsePeso("free"), null);
  assert.equal(formatPeso(1200), "₱1,200");
  assert.equal(formatPeso(99.5), "₱99.50");
});

test("the summary is the range, lowest to highest", () => {
  assert.equal(priceSummary([]), null);
  assert.equal(priceSummary([{ amount: 0 }]), "Free");
  assert.equal(priceSummary([{ amount: 795 }]), "₱795");
  assert.equal(priceSummary([{ amount: 1200 }, { amount: 500 }, { amount: 795 }]), "₱500 – ₱1,200");
  assert.equal(priceSummary([{ amount: 0 }, { amount: 350 }]), "Free – ₱350");
});

test("tiers are cleaned; empty rows dropped, bad amounts refused", () => {
  assert.deepEqual(cleanTiers('[{"label":" Early  bird ","amount":"₱500"},{"label":"","amount":""}]').tiers, [{ label: "Early bird", amount: 500 }]);
  assert.match(cleanTiers('[{"amount":"five hundred"}]').error, /isn't a price/);
  assert.match(cleanTiers(JSON.stringify(Array.from({ length: 7 }, () => ({ amount: 1 })))).error, /Up to 6/);
});

test("older events keep working from their cost text", () => {
  assert.deepEqual(tiersFromCost("Free"), [{ label: "", amount: 0 }]);
  assert.deepEqual(tiersFromCost("795"), [{ label: "", amount: 795 }]);
  assert.equal(tiersFromCost("₱500 with shirt"), null);
  const row = { slug: "a", date: "2026-12-01", registration: "none", status: "published", cost: "₱500 with shirt" };
  assert.equal(toPublicEvent(row).cost, "₱500 with shirt");
});

test("a free event never tracks a fee", () => {
  const { value } = validateEvent({ title: "Run", date: "2026-12-01", priceTiers: '[{"amount":0}]', feeRequired: "on" });
  assert.equal(value.feeRequired, false);
  assert.equal(value.cost, "Free");
});

test("extra photos must be the site's own uploads, three at most", () => {
  const id = "/api/event-image/0d6a3b0c-1111-4222-8333-944455556666";
  assert.deepEqual(cleanGallery(JSON.stringify([{ src: id, alt: " A poster " }, { src: "https://evil.example/x.jpg" }])).gallery, [{ src: id, alt: "A poster", fit: "fit" }]);
  assert.match(cleanGallery(JSON.stringify([1, 2, 3, 4].map(() => ({ src: id })))).error, /Up to 4 photos/);
});

test("photo uploaders are limited to the known groups", () => {
  assert.deepEqual(cleanUploaders(["members", "hackers", "sponsors"]), ["members", "sponsors"]);
});

test("the event page shows the uncropped cover first, then the extras", () => {
  const event = toPublicEvent({
    slug: "a", date: "2026-12-01", registration: "none", status: "published",
    image: "/api/event-image/crop", image_source: "/api/event-image/full", image_alt: "Poster",
    gallery: [{ src: "/api/event-image/two", alt: "Venue" }],
  });
  assert.deepEqual(event.media.map((m) => m.src), ["/api/event-image/full", "/api/event-image/two"]);
});

test("a cover set to Fill uses the framed crop; Fit and Tile the original", () => {
  const row = { slug: "a", date: "2026-12-01", registration: "none", status: "published", image: "/crop", image_source: "/full" };
  assert.equal(toPublicEvent({ ...row, image_fit: "fill" }).media[0].src, "/crop");
  assert.equal(toPublicEvent({ ...row, image_fit: "tile" }).media[0].src, "/full");
  assert.equal(toPublicEvent({ ...row, image_fit: "bogus" }).media[0].fit, "fit");
});

test("tiers show lowest first on the event page", () => {
  const row = { slug: "a", date: "2026-12-01", registration: "none", status: "published", price_tiers: [{ label: "Regular", amount: 795 }, { label: "Early bird", amount: 695 }] };
  assert.deepEqual(toPublicEvent(row).priceTiers.map((t) => t.label), ["Early bird", "Regular"]);
});

test("a placeholder beneficiary is never shown and doesn't count as filled in", () => {
  for (const text of ["To be named", "TBA", "t.b.d.", "N/A", "-"]) assert.ok(isPlaceholder(text), text);
  assert.equal(isPlaceholder("MBY Pet Rescue"), false);
  const row = { slug: "a", date: "2026-12-01", registration: "none", status: "published", is_charity: true, supports: "To be named" };
  assert.equal(toPublicEvent(row).supports, undefined);
  const { missing } = validateEvent({ title: "Run", date: "2026-12-01", isCharity: "on", supports: "TBA", category: "Fundraisers", venue: "Park", city: "Pasig", summary: "Hi" });
  assert.deepEqual(missing, ["Beneficiary"]);
});

test("what's included: one per line, bullets trimmed, ten at most", () => {
  assert.deepEqual(cleanIncluded("• Bedazzling kit\n- 1 drink\n\n✓ Furbaby treat"), ["Bedazzling kit", "1 drink", "Furbaby treat"]);
  assert.equal(cleanIncluded(Array.from({ length: 12 }, (_, i) => `Item ${i}`)).length, 10);
});
