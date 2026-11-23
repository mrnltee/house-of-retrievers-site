// Fixes from the live site audit (22 Nov 2026).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maskAccountNumber, maskMobile, publicMethods } from "./admin/payments.mjs";
import { toPublicEvent } from "./admin/events.mjs";

test("Copy gives the full number while the screen shows it partly hidden", () => {
  const rows = [
    { key: "gcash", enabled: true, details: { accountName: "HOR", number: "09123456789", maskNumber: true } },
    { key: "bank", enabled: true, details: { accountName: "HOR", bankName: "BDO", accountNumber: "1234567890", maskNumber: true } },
    { key: "gotyme", enabled: true, details: { accountName: "HOR", number: "09987654321" } },
  ];
  const byKey = Object.fromEntries(publicMethods(rows).map((m) => [m.key, m]));
  assert.equal(byKey.gcash.details.number, maskMobile("09123456789"));
  assert.equal(byKey.gcash.copy.number, "09123456789");
  assert.equal(byKey.bank.details.accountNumber, maskAccountNumber("1234567890"));
  assert.equal(byKey.bank.copy.accountNumber, "1234567890");
  assert.equal(byKey.gotyme.details.number, "0998 765 4321");
  assert.equal(byKey.gotyme.copy.number, "09987654321");
  const modal = readFileSync(new URL("../components/SupportModal.jsx", import.meta.url), "utf8");
  assert.match(modal, /<CopyButton value=\{copy \|\| value\}/);
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

test("both site headers come back on scroll-up, with Join as the gold pill", () => {
  const src = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
  assert.match(src("../components/Header.jsx"), /useHeaderReturn\(menuOpen\)/);
  assert.match(src("../components/EventsView.jsx"), /<header className=\{headerClass\}>/);
  assert.match(src("../globals.css"), /\.nav \.nav-cta \{[^}]*background: var\(--gold\)/);
});

test("the event page leads with the title, date and venue before the poster", () => {
  const src = readFileSync(new URL("../components/EventsView.jsx", import.meta.url), "utf8");
  assert.ok(src.indexOf('className="event-detail-head"') < src.indexOf('className="event-detail-media"'));
});
