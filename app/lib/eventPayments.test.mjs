import test from "node:test";
import assert from "node:assert/strict";
import { chooseTicket, cleanReference, dogTicketsSoldOut, inOrderTiers, nextTierNote, openTiers, visibleTiers, owesPayment, parsePeso, passState, paymentNotice, readProofImage, referenceKey, ticketLine, validateProof } from "./eventPayments.mjs";

test("payment notices match the event policy", () => {
  assert.match(paymentNotice({ isCharity: true }), /fundraising event/);
  assert.match(paymentNotice({ isCharity: false }), /Early bird rates are limited/);
  assert.match(paymentNotice({ onsitePayment: true }), /On-site payment.*regular rate/);
});

test("tickets: one price needs no choice; several need a valid pick", () => {
  const tiers = [{ label: "Human + 1 furbaby", amount: 795 }, { label: "Extra human", amount: 350 }];
  assert.deepEqual(chooseTicket(tiers, "1").value, { label: "Extra human", amount: 350 });
  assert.match(chooseTicket(tiers, undefined).error, /Pick a ticket/);
  assert.match(chooseTicket(tiers, 5).error, /Pick a ticket/);
  assert.deepEqual(chooseTicket([{ amount: 500 }], undefined).value, { label: null, amount: 500 });
  assert.deepEqual(chooseTicket([], 0).value, { label: null, amount: null });
  assert.equal(owesPayment(true, { amount: 0 }), false);
  assert.equal(owesPayment(true, { amount: null }), true);
  assert.equal(owesPayment(false, { amount: 795 }), false);
  assert.equal(ticketLine("Extra human", 350), "Extra human · ₱350");
  assert.equal(ticketLine(null, 0), "Free");
});

test("ticket choice keeps its attendance rule for the server-side price check", () => {
  const tier = { label: "Furbaby package", amount: 760, attendanceBasis: "furbaby_package", includedHumansPerFurbaby: 2, additionalHumanFee: 100 };
  assert.deepEqual(chooseTicket([tier], undefined).value, tier);
});

test("proof: method, reference and amount are checked", () => {
  assert.deepEqual(validateProof({ method: "gcash", reference: " 1012 345 678 901 ", amount: "₱795.00" }).value, { method: "gcash", reference: "1012 345 678 901", amount: 795 });
  assert.match(validateProof({ method: "cash", reference: "1" }).error, /how you paid/);
  assert.match(validateProof({ method: "maya", reference: "" }).error, /reference number/);
  assert.match(validateProof({ method: "maya", reference: "<script>" }).error, /letters and numbers/);
  assert.match(validateProof({ method: "maya", reference: "ABC123", amount: "lots" }).error, /pesos/);
  assert.deepEqual(validateProof({ method: "cash", reference: "", amount: "500" }, { admin: true }).value, { method: "cash", reference: "", amount: 500 });
  assert.equal(cleanReference("ab-12 34"), "AB-12 34");
  assert.equal(referenceKey("1012 345-678"), referenceKey("1012345678"));
  assert.equal(parsePeso(""), null);
  assert.ok(readProofImage("data:image/png;base64,iVBORw0KGgo=").value);
  assert.match(readProofImage("data:text/html;base64,PGI+").error, /screenshot/);
  assert.match(readProofImage("data:text/html;base64,PGI+", { label: "vaccination record photo" }).error, /vaccination record photo/);
});

test("pass page: no QR until a payment is approved", () => {
  const reg = { status: "confirmed", fee_required: true };
  assert.equal(passState({ ...reg, fee_status: "paid" }), "pass");
  assert.equal(passState({ ...reg, fee_status: "not_due" }), "pass");
  assert.equal(passState({ ...reg, fee_status: "review" }), "review");
  assert.equal(passState({ ...reg, fee_status: "waiting" }), "waiting");
  assert.equal(passState({ ...reg, status: "waitlist", fee_status: "not_due" }), "waitlist");
  assert.equal(passState({ status: "confirmed", fee_required: false, fee_status: "waiting" }), "pass");
});

test("chooseTicket inOrder: only the first tier on sale is offered; the next opens when it sells out", () => {
  const tiers = [{ label: "Early Bird", amount: 1750, limit: 20 }, { label: "Regular", amount: 1950 }];
  assert.equal(chooseTicket(tiers, undefined, { inOrder: true }).value.label, "Early Bird");
  assert.match(chooseTicket(tiers, "1", { inOrder: true }).error, /Early Bird/);
  const full = { "Early Bird|1750": 20 };
  assert.equal(chooseTicket(tiers, undefined, { inOrder: true, counts: full }).value.label, "Regular");
  assert.equal(chooseTicket(tiers, "1", { inOrder: true, anyTier: true }).value.label, "Regular");
});

test("inOrderTiers / nextTierNote", () => {
  const tiers = [{ label: "Early Bird", amount: 1750, limit: 20 }, { label: "Regular", amount: 1950 }];
  assert.deepEqual(inOrderTiers(tiers.map((t, i) => ({ ...t, i }))).map((t) => t.label), ["Early Bird"]);
  assert.equal(nextTierNote(tiers, 0), "Regular ₱1,950 once the first 20 are taken");
  assert.equal(nextTierNote(tiers, 1), "");
  assert.equal(nextTierNote([{ label: "Early", amount: 1, until: "2026-11-10T15:59:00.000Z" }, { label: "Regular", amount: 2 }], 0), "Regular ₱2 after Nov 10, 11:59 PM");
});

test("chooseTicket inOrder: a tier marked withPrevious opens together with the one above", () => {
  const tiers = [{ label: "Early Bird", amount: 1750, limit: 20, limitUnit: "furbabies" }, { label: "Regular", amount: 1950, limit: 5, limitUnit: "furbabies" }, { label: "Hooman only", amount: 1850, attendanceBasis: "human_only", withPrevious: true }];
  assert.equal(chooseTicket(tiers, undefined, { inOrder: true }).value.label, "Early Bird");
  assert.match(chooseTicket(tiers, "2", { inOrder: true }).error, /Early Bird/);
  const ebFull = { "Early Bird|1750": 20 };
  assert.equal(chooseTicket(tiers, "1", { inOrder: true, counts: ebFull }).value.label, "Regular");
  assert.equal(chooseTicket(tiers, "2", { inOrder: true, counts: ebFull }).value.label, "Hooman only");
  assert.match(chooseTicket(tiers, undefined, { inOrder: true, counts: ebFull }).error, /Pick a ticket/);
  const bothFull = { "Early Bird|1750": 20, "Regular|1950": 5 };
  assert.equal(chooseTicket(tiers, undefined, { inOrder: true, counts: bothFull }).value.label, "Hooman only");
  assert.deepEqual(inOrderTiers(tiers.slice(1).map((t, i) => ({ ...t, i: i + 1 }))).map((t) => t.label), ["Regular", "Hooman only"]);
});

test("visibleTiers: later prices stay hidden until they open; closed ones stay listed", () => {
  const tiers = [{ label: "Early Bird", amount: 1750, limit: 20, limitUnit: "furbabies" }, { label: "Regular", amount: 1950, limit: 5, limitUnit: "furbabies" }, { label: "Hooman only", amount: 1850, attendanceBasis: "human_only", withPrevious: true }];
  assert.deepEqual(visibleTiers(tiers, {}).map((t) => t.label), ["Early Bird"]);
  assert.deepEqual(visibleTiers(tiers, { "Early Bird|1750": 20 }).map((t) => t.label), ["Early Bird", "Regular", "Hooman only"]);
  assert.deepEqual(visibleTiers(tiers, { "Early Bird|1750": 20, "Regular|1950": 5 }).map((t) => t.label), ["Early Bird", "Regular", "Hooman only"]);
  assert.deepEqual(openTiers(tiers, {}).map((t) => t.label), ["Early Bird"]);
  assert.deepEqual(openTiers(tiers, { "Early Bird|1750": 20 }).map((t) => t.label), ["Regular", "Hooman only"]);
});

test("dogTicketsSoldOut: true only when every ticket with a furbaby is closed", () => {
  const tiers = [{ label: "Early Bird", amount: 1750, limit: 20, limitUnit: "furbabies" }, { label: "Regular", amount: 1950, limit: 5, limitUnit: "furbabies" }, { label: "Hooman only", amount: 1850, attendanceBasis: "human_only", withPrevious: true }];
  assert.equal(dogTicketsSoldOut(tiers, {}), false);
  assert.equal(dogTicketsSoldOut(tiers, { "Early Bird|1750": 20 }), false);
  assert.equal(dogTicketsSoldOut(tiers, { "Early Bird|1750": 20, "Regular|1950": 5 }), true);
  assert.equal(dogTicketsSoldOut([], {}), false);
  assert.equal(dogTicketsSoldOut([{ label: "Hooman only", amount: 1, attendanceBasis: "human_only" }], {}), false);
});
