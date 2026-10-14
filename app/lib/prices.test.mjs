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

test("ticket-specific attendance rules stay with each tier", () => {
  const { tiers } = cleanTiers([
    { label: "Hooman only", amount: "100", attendanceBasis: "human_only" },
    { label: "Furbaby", amount: "760", attendanceBasis: "furbaby_package", includedHumansPerFurbaby: "2", additionalHumanFee: "100" },
  ], { pricingBasis: "tiered" });
  assert.deepEqual(tiers, [
    { label: "Hooman only", amount: 100, attendanceBasis: "human_only" },
    { label: "Furbaby", amount: 760, attendanceBasis: "furbaby_package", includedHumansPerFurbaby: 2, additionalHumanFee: 100 },
  ]);
  assert.match(cleanTiers([{ amount: 760, attendanceBasis: "furbaby_package", includedHumansPerFurbaby: 0 }], { pricingBasis: "tiered" }).error, /included people/);
  assert.deepEqual(cleanTiers([{ amount: 0 }], { pricingBasis: "tiered" }).tiers, [{ label: "", amount: 0 }]);
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

test("price tiers can have a sale period (early bird)", async () => {
  const { activeTiers, tierAvailable, tierWindow } = await import("./prices.mjs");
  const { chooseTicket } = await import("./eventPayments.mjs");
  const { tiers } = cleanTiers([{ label: "Early bird", amount: "650", until: "2026-10-10T15:59:00.000Z" }, { label: "Regular", amount: "795" }]);
  assert.equal(tiers[0].until, "2026-10-10T15:59:00.000Z");
  const before = Date.parse("2026-10-09T00:00:00Z");
  const after = Date.parse("2026-10-12T00:00:00Z");
  assert.equal(tierAvailable(tiers[0], before), true);
  assert.equal(tierAvailable(tiers[0], after), false);
  assert.deepEqual(activeTiers(tiers, after).map((t) => t.label), ["Regular"]);
  assert.equal(tierWindow(tiers[0], before), "Until Oct 10, 11:59 PM");
  assert.equal(tierWindow(tiers[0], after), "Ended Oct 10");
  // After the cutoff the early bird can't be chosen; the one tier left is picked by itself.
  assert.match(chooseTicket(tiers, 0, { now: after }).error, /Early bird rate has ended/);
  assert.deepEqual(chooseTicket(tiers, undefined, { now: after }).value, { label: "Regular", amount: 795 });
  assert.deepEqual(chooseTicket(tiers, 1, { now: after }).value, { label: "Regular", amount: 795 });
  assert.match(chooseTicket(tiers, undefined, { now: before }).error, /Pick a ticket/);
  // An admin adding someone who paid before the cutoff may still pick it.
  assert.deepEqual(chooseTicket(tiers, 0, { now: after, anyTier: true }).value, { label: "Early bird", amount: 650 });
  assert.match(cleanTiers([{ amount: 5, from: "2026-10-10T00:00:00Z", until: "2026-10-09T00:00:00Z" }]).error, /ends before it starts/);
});

test("an early bird for the first N registrants, then the regular rate", async () => {
  const { activeTiers, tierAvailable, tierKey, tierLeft } = await import("./prices.mjs");
  const { chooseTicket } = await import("./eventPayments.mjs");
  const { countsFromRows } = await import("./ticketCounts.mjs");
  const { tiers } = cleanTiers([{ label: "Early bird", amount: "650", limit: "20" }, { label: "Regular", amount: "795" }]);
  assert.equal(tiers[0].limit, 20);
  assert.match(cleanTiers([{ amount: 5, limit: "lots" }]).error, /whole number/);
  const nineteen = countsFromRows([{ label: "Early bird", amount: 650, n: 19 }, { label: "", amount: 795, n: 4 }]);
  assert.equal(tierKey(tiers[0]), "Early bird|650");
  assert.equal(tierLeft(tiers[0], nineteen), 1);
  assert.deepEqual(chooseTicket(tiers, 0, { counts: nineteen }).value, { label: "Early bird", amount: 650 });
  const twenty = { ...nineteen, "Early bird|650": 20 };
  assert.equal(tierAvailable(tiers[0], Date.now(), twenty), false);
  assert.deepEqual(activeTiers(tiers, Date.now(), twenty).map((t) => t.label), ["Regular"]);
  // The 21st: the early bird is refused, and with one price left it's picked by itself.
  assert.match(chooseTicket(tiers, 0, { counts: twenty }).error, /sold out \(it was for the first 20 registrants\)/);
  assert.deepEqual(chooseTicket(tiers, undefined, { counts: twenty }).value, { label: "Regular", amount: 795 });
  // Public view: places left on the RSVP, taken on the event page, the card shows what's on sale.
  const pub = toPublicEvent({ status: "published", registration: "required", rsvp_open: true, fee_required: true, date: "2099-01-01", title: "T", slug: "t", venue: "V", city: "C", price_tiers: tiers, ticket_counts: twenty }, 24);
  assert.equal(pub.tickets[0].left, 0);
  assert.equal(pub.cost, "₱795");
  assert.match(pub.priceTiers[0].window, /Sold out/);
});
