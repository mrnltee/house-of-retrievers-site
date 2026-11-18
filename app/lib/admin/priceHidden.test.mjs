import test from "node:test";
import assert from "node:assert/strict";
import { priceHidden, toPublicEvent, withPriceHidden } from "./events.mjs";

const NOW = Date.parse("2026-11-20T00:00:00Z");
const later = "2026-11-25T02:00:00Z";
const earlier = "2026-11-19T02:00:00Z";

test("the price stays private only while a scheduled opening is still ahead and the switch is on", () => {
  assert.equal(priceHidden({ price_hidden_until_open: true, rsvp_opens_at: later }, NOW), true);
  assert.equal(priceHidden({ price_hidden_until_open: true, rsvp_opens_at: earlier }, NOW), false);
  assert.equal(priceHidden({ price_hidden_until_open: false, rsvp_opens_at: later }, NOW), false);
  assert.equal(priceHidden({ price_hidden_until_open: true, rsvp_opens_at: null }, NOW), false);
  assert.equal(priceHidden({ price_hidden_until_open: true, rsvp_opens_at: new Date(later) }, NOW), true);
});

test("a hidden price leaves no price, price list or tickets on the public event", () => {
  const event = { title: "A", cost: "₱1,750", priceTiers: [{ amount: 1750 }], tickets: [{ amount: 1750 }], dogWaitlistOpen: true, status: "soon" };
  const hidden = withPriceHidden(event, { price_hidden_until_open: true, rsvp_opens_at: later }, NOW);
  assert.equal(hidden.cost, undefined);
  assert.equal(hidden.priceTiers, undefined);
  assert.equal(hidden.tickets, undefined);
  assert.equal(hidden.dogWaitlistOpen, undefined);
  assert.equal(hidden.pricePending, true);
  assert.equal(hidden.title, "A");
  assert.deepEqual(withPriceHidden(event, { price_hidden_until_open: true, rsvp_opens_at: earlier }, NOW), event);
});

test("toPublicEvent applies it", () => {
  const row = { slug: "a", title: "A", date: "2099-01-01", status: "published", registration: "required", fee_required: true, price_tiers: [{ label: "Early Bird", amount: 1750 }], rsvp_opens_at: "2098-12-01T02:00:00Z", price_hidden_until_open: true };
  const shown = toPublicEvent({ ...row, price_hidden_until_open: false }, 0);
  assert.ok(shown.cost && shown.tickets);
  const hidden = toPublicEvent(row, 0);
  assert.equal(hidden.cost, undefined);
  assert.equal(hidden.tickets, undefined);
  assert.equal(hidden.pricePending, true);
});
