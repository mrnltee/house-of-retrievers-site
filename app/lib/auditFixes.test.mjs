// Fixes from the live site audit (22 Nov 2026).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isPartlyHidden } from "./partlyHidden.mjs";
import { maskAccountNumber, maskMobile } from "./admin/payments.mjs";
import { toPublicEvent } from "./admin/events.mjs";

test("a partly hidden number is never offered for copying", () => {
  assert.equal(isPartlyHidden(maskMobile("0912 345 6789")), true);
  assert.equal(isPartlyHidden(maskAccountNumber("1234 5678 90")), true);
  assert.equal(isPartlyHidden("0000084672566"), false);
  assert.equal(isPartlyHidden("0912 345 6789"), false);
  assert.equal(isPartlyHidden(undefined), false);
  const modal = readFileSync(new URL("../components/SupportModal.jsx", import.meta.url), "utf8");
  assert.match(modal, /!isPartlyHidden\(value\) && <CopyButton/);
  assert.match(modal, /Save QR image/);
});

test("an ended first-N tier says it ended, not how many are left", () => {
  const row = {
    slug: "a", title: "A", date: "2099-01-01", status: "published", registration: "required", fee_required: true,
    price_tiers: [
      { label: "Early bark rate", amount: 950, limit: 5, until: "2020-01-01T15:59:00Z" },
      { label: "Regular", amount: 1150 },
    ],
  };
  const early = toPublicEvent(row).priceTiers.find((t) => t.label === "Early bark rate");
  assert.match(early.window, /^Ended /);
  assert.doesNotMatch(early.window, /left/);
  assert.equal(early.ended, true);
});

test("the RSVP limit note starts with a capital letter", () => {
  const modal = readFileSync(new URL("../components/RsvpModal.jsx", import.meta.url), "utf8");
  assert.match(modal, /join\(", "\)\.replace\(\/\^\.\/, \(c\) => c\.toUpperCase\(\)\)/);
});
