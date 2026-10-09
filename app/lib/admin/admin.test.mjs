import test from "node:test";
import assert from "node:assert/strict";
import { can, canApprovePaymentChange, cleanRoles, parseEmailList, signedInRecently } from "./roles.mjs";
import { diffChange, formatMobile, needsApproval, normalizeMobile, publicMethods, validateChange } from "./payments.mjs";
import { publicStatus, slugify, toPublicEvent, validateEvent } from "./events.mjs";
import { checkInOutcome, newCheckInCode, normalizeCode, statusForNewRegistration, validateRsvp } from "./registrations.mjs";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

test("roles grant only what the plan lists", () => {
  assert.equal(can(["treasurer"], "payments:request"), true);
  assert.equal(can(["treasurer"], "payments:approve"), false);
  assert.equal(can(["checkin"], "checkin"), true);
  assert.equal(can(["checkin"], "registrations:view"), false);
  assert.equal(can(["content"], "admins:manage"), false);
  assert.equal(can(["owner"], "made-up:capability"), false);
  assert.equal(can(undefined, "events:view"), false);
});

test("owner emails and roles are cleaned", () => {
  assert.deepEqual(parseEmailList(" A@Gmail.com, b@x.org  not-an-email"), ["a@gmail.com", "b@x.org"]);
  assert.deepEqual(cleanRoles(["treasurer", "owner", "superuser", "owner"]), ["owner", "treasurer"]);
});

test("a payment change needs a different Owner to approve it", () => {
  const base = { requestedBy: "t@x.org" };
  assert.equal(canApprovePaymentChange({ ...base, approverEmail: "o@x.org", approverRoles: ["owner"] }), true);
  assert.equal(canApprovePaymentChange({ ...base, approverEmail: "T@x.org", approverRoles: ["owner"] }), false, "not your own request");
  assert.equal(canApprovePaymentChange({ ...base, approverEmail: "o@x.org", approverRoles: ["treasurer"] }), false, "Owners only");
});

test("approvals need a sign-in from the last ten minutes", () => {
  const now = 1_000_000_000;
  assert.equal(signedInRecently(now - 5 * 60_000, now), true);
  assert.equal(signedInRecently(now - 11 * 60_000, now), false);
  assert.equal(signedInRecently(undefined, now), false);
});

test("mobile numbers are normalised and formatted", () => {
  assert.equal(normalizeMobile("0917 123 4567"), "09171234567");
  assert.equal(normalizeMobile("+63 917-123-4567"), "09171234567");
  assert.equal(normalizeMobile("12345"), "");
  assert.equal(formatMobile("09171234567"), "0917 123 4567");
});

test("payment changes are validated before anyone can approve them", () => {
  assert.match(validateChange("gcash", { enabled: true, details: { accountName: "HOR" } }).error, /Mobile number/);
  assert.match(validateChange("gcash", { enabled: true, details: { accountName: "HOR", number: "123" } }).error, /PH mobile/);
  assert.match(validateChange("qrph", { enabled: true, details: { accountName: "HOR" } }).error, /QR image/);
  assert.match(validateChange("gcash", { details: {}, qrImage: PNG, qrPayload: "" }).error, /doesn't scan/);
  assert.match(validateChange("gcash", { details: {}, qrImage: "data:image/gif;base64,AAAA", qrPayload: "x" }).error, /PNG, JPG/);
  const ok = validateChange("gcash", { enabled: "on", details: { accountName: " HOR  PH ", number: "0917 123 4567" }, qrImage: PNG, qrPayload: "000201..." });
  assert.deepEqual(ok.value.details, { accountName: "HOR PH", number: "09171234567" });
  assert.equal(ok.value.enabled, true);
  assert.equal(validateChange("paypal", {}).error, "Unknown payment method.");
});

test("switching a method off skips approval; anything else needs it", () => {
  const live = { enabled: true, details: { accountName: "HOR", number: "09171234567" } };
  assert.equal(needsApproval(live, { ...live, enabled: false }), false);
  assert.equal(needsApproval(live, { enabled: true, details: { accountName: "HOR", number: "09179999999" } }), true);
  assert.equal(needsApproval({ enabled: false, details: {} }, { enabled: true, details: {} }), true);
  assert.deepEqual(diffChange(live, { enabled: true, details: { accountName: "HOR", number: "09179999999" }, qrImage: PNG }), ["number", "qrImage"]);
});

test("the Support panel shows only switched-on methods", () => {
  const shown = publicMethods([
    { key: "maya", enabled: false, details: {} },
    { key: "gcash", enabled: true, details: { accountName: "HOR", number: "09171234567" }, qr_image: null, updated_at: "2026-10-09T02:00:00Z" },
  ]);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].details.number, "0917 123 4567");
});

test("events: drafts may be incomplete, publishing may not", () => {
  const draft = validateEvent({ title: "Free Hugs Day", date: "2026-10-25" });
  assert.ok(draft.value);
  assert.deepEqual(draft.missing, ["Category", "Venue", "City", "Summary"]);
  assert.match(validateEvent({ title: "Free Hugs Day", date: "2026-10-25" }, { publish: true }).error, /Category, Venue, City, Summary/);
  assert.match(validateEvent({ title: "x", date: "2026-10-25", startTime: "10:00", endTime: "09:00" }).error, /after the start/);
  assert.match(validateEvent({ title: "x", date: "soon" }).error, /date/);
  assert.match(validateEvent({ title: "x", date: "2026-10-25", capacity: "0" }).error, /Capacity/);
  assert.equal(slugify("Bedazzle Barkdate!", "2026-10-17"), "bedazzle-barkdate-2026-10");
});

test("public status follows capacity and RSVP settings", () => {
  const row = { status: "published", registration: "required", rsvp_open: true, capacity: 20 };
  assert.equal(publicStatus(row, 5), "open");
  assert.equal(publicStatus(row, 17), "few-left");
  assert.equal(publicStatus(row, 20), "full");
  assert.equal(publicStatus({ ...row, rsvp_open: false }, 0), "closed");
  assert.equal(publicStatus({ ...row, registration: "none" }, 0), "no-rsvp");
  assert.equal(publicStatus({ ...row, status: "cancelled" }, 0), "cancelled");
  const ev = toPublicEvent({ ...row, slug: "s", title: "T", category: "Workshops", date: new Date("2026-10-17T00:00:00Z"), venue: "V", city: "C", fee_required: true }, 0);
  assert.equal(ev.date, "2026-10-17");
  assert.equal(ev.rsvp, true);
});

test("RSVPs: explicit photo choice, guardian for under 18s, waitlist when full", () => {
  assert.match(validateRsvp({ name: "A", email: "a@x.org" }).error, /photos/);
  assert.match(validateRsvp({ name: "A", email: "a@x.org", photoConsent: "no", under18: "yes" }).error, /guardian/);
  const ok = validateRsvp({ name: " A ", email: "A@X.org", photoConsent: "no", under18: "yes", guardianName: "Parent" });
  assert.deepEqual(ok.value, { name: "A", email: "a@x.org", furbabyName: null, photoConsent: false, under18: true, guardianName: "Parent" });
  assert.equal(statusForNewRegistration({ capacity: null, confirmed: 99 }), "confirmed");
  assert.equal(statusForNewRegistration({ capacity: 18, confirmed: 17 }), "confirmed");
  assert.equal(statusForNewRegistration({ capacity: 18, confirmed: 18 }), "waitlist");
});

test("check-in codes are readable, unique enough, and checked against the event", () => {
  const codes = new Set(Array.from({ length: 500 }, () => newCheckInCode()));
  assert.equal(codes.size, 500);
  for (const code of codes) assert.match(code, /^[2-9A-HJKMNP-Z]{10}$/);
  const code = [...codes][0];
  assert.equal(normalizeCode(code.toLowerCase().replace(/(.{5})/, "$1-")), code);
  assert.equal(normalizeCode("O0O0O0O0O0"), "");
  const reg = { event_id: "e1", status: "confirmed", checked_in_at: null };
  assert.equal(checkInOutcome(reg, "e1"), "ok");
  assert.equal(checkInOutcome({ ...reg, checked_in_at: new Date() }, "e1"), "already");
  assert.equal(checkInOutcome({ ...reg, status: "waitlist" }, "e1"), "not-confirmed");
  assert.equal(checkInOutcome(reg, "e2"), "wrong-event");
  assert.equal(checkInOutcome(null, "e1"), "unknown");
});

test("a QR Ph change can keep the QR already approved", () => {
  assert.match(validateChange("qrph", { enabled: true, details: { accountName: "HOR" } }).error, /QR image/);
  assert.ok(validateChange("qrph", { enabled: true, details: { accountName: "HOR" }, hasQr: true }).value);
});
