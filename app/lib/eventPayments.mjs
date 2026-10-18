/**
 * Paid events: tickets, the proof a registrant uploads, and the states an
 * admin moves a payment through (Figma "Event payments", 12 Oct 2026).
 *
 *   not_due   no fee (free event, free ticket, or on the waitlist)
 *   waiting   spot held, no proof yet ("Payment pending")
 *   review    reference + screenshot sent ("To check")
 *   rejected  an admin asked for a new receipt (their spot stays held)
 *   paid      matched by an admin; the QR pass is emailed
 *
 * New paid holds have a ten-minute payment window; payment wording is event-specific.
 * Pure functions: shared by the routes, the admin and the tests.
 */

import { formatPeso, tierAvailable, tierWindow } from "./prices.mjs";

export const FEE_STATUS = {
  not_due: { label: "No fee", tone: "" },
  waiting: { label: "Payment pending", tone: "" },
  review: { label: "To check", tone: "warn" },
  rejected: { label: "New receipt asked", tone: "alert" },
  paid: { label: "Paid", tone: "good" },
};

/** Fee statuses that still owe a payment: no QR pass, and the door says "not confirmed". */
export const UNPAID = ["waiting", "review", "rejected"];

/** Channels a registrant can say they paid with (Payment settings keys), plus admin-only ones. */
export const PAY_METHODS = { gcash: "GCash", maya: "Maya", gotyme: "GoTyme", qrph: "QR Ph", bank: "Bank transfer" };
export const ADMIN_PAY_METHODS = { ...PAY_METHODS, cash: "Cash", other: "Other" };
export const payMethodLabel = (key) => ADMIN_PAY_METHODS[key] || "";

export const CHARITY_PAYMENT_NOTICE = "All payments are non-refundable. As this is a fundraising event, proceeds will go toward supporting our chosen cause. Thank you for being part of something meaningful! 🐾";
export const EVENT_PAYMENT_NOTICE = "All payments are non-refundable. Early bird rates are limited and may end once the offer period or available slots are reached. The regular rate applies after that.";
export function paymentNotice({ isCharity = false, onsitePayment = false } = {}) {
  if (isCharity) return CHARITY_PAYMENT_NOTICE;
  return `${EVENT_PAYMENT_NOTICE}${onsitePayment ? " On-site payment, if available, is charged at the regular rate." : ""}`;
}
// Kept for older imports; new surfaces should use paymentNotice(event).
export const NO_REFUND = CHARITY_PAYMENT_NOTICE;
export const READABLE = "Make sure the amount, date and reference number are readable. A screenshot straight from the app is best.";

/** Reasons an admin can pick when asking for a new receipt (they can still type their own). */
export const REJECT_REASONS = [
  "We can't read the reference number on this screenshot. Please upload the receipt straight from your payment app.",
  "The amount doesn't match the ticket. Please check the amount and upload the receipt for the full payment.",
  "We couldn't find this reference number in our payment history. Please check it and upload the receipt again.",
];

/** Largest screenshot accepted, as decoded bytes (the browser resizes to 1600 px first). */
export const MAX_PROOF_BYTES = 3 * 1024 * 1024;

const peso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;

/** "₱795", "795.00", "1,200" → 795 / 1200; "" → null; anything else → undefined. */
export function parsePeso(value) {
  const text = String(value ?? "").replace(/[₱,\s]/g, "").replace(/^PHP/i, "");
  if (!text) return null;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) return undefined;
  return Math.round(Number(text));
}

/** A reference number as typed on a receipt: letters, digits, spaces and dashes, 4–40 long. */
export function cleanReference(value) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  if (!text) return "";
  return /^[A-Z0-9][A-Z0-9 -]{2,38}[A-Z0-9]$/.test(text) ? text : null;
}

/** For comparing: "1012 345-678" and "1012345678" are the same reference. */
export const referenceKey = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * The ticket someone picked. `tiers` are the event's price tiers
 * ([{label, amount, from?, until?}], see eventTiers); `index` points into
 * that full list. Only tiers on sale now count (an early bird rate ends at
 * its cutoff, or once its first-N attendance units are in: `counts`, see
 * tierKey); with one on sale there is nothing to choose. An admin adding
 * someone by hand may pick any tier (`anyTier`), e.g. an early bird who paid
 * before the cutoff.
 * @returns {{ value?: {label: string|null, amount: number|null}, error?: string }}
 */
export function chooseTicket(tiers, index, { now = Date.now(), anyTier = false, counts = {}, inOrder = false } = {}) {
  const list = Array.isArray(tiers) ? tiers : [];
  if (list.length === 0) return { value: { label: null, amount: null } };
  const pick = (t) => {
    const value = { label: t.label || null, amount: t.amount ?? null };
    for (const key of ["attendanceBasis", "includedHumansPerFurbaby", "additionalHumanFee", "extraHumanFee", "extraFurbabyFee", "limitUnit", "withPrevious"]) {
      if (t[key] !== undefined) value[key] = t[key];
    }
    return { value };
  };
  const available = list.map((t, i) => [t, i]).filter(([t]) => anyTier || tierAvailable(t, now, counts));
  if (available.length === 0) return { error: "Tickets for this event aren't on sale right now." };
  // "Offer prices in order" (events.tiers_in_order): only the first tier still on sale is offered.
  const onSale = inOrder && !anyTier ? openGroup(available, ([t]) => t) : available;
  const i = index === undefined || index === null || index === "" ? NaN : Number(index);
  if (Number.isInteger(i) && list[i]) {
    if (onSale.some(([, j]) => j === i)) return pick(list[i]);
    if (available.some(([, j]) => j === i)) return { error: `The ${onSale[0][0].label || "first"} rate is still open, so it comes first. Pick that one.` };
    const name = list[i].label || "chosen";
    if (list[i].limit && tierAvailable({ ...list[i], limit: undefined }, now)) {
      return { error: `The ${name} rate is sold out (it was for the first ${list[i].limit} ${list[i].limitUnit === "furbabies" || list[i].limitUnit === "hoomans" ? list[i].limitUnit : "registrants"}). Pick another ticket.` };
    }
    return { error: `The ${name} rate has ended. Pick another ticket.` };
  }
  if (onSale.length === 1) return pick(onSale[0][0]);
  return { error: "Pick a ticket." };
}

/** Whether a new confirmed registration owes a payment: a paid event, and a ticket that isn't free. */
export function owesPayment(feeRequired, ticket) {
  return Boolean(feeRequired) && !(ticket && ticket.amount === 0);
}

/** "Human + 1 furbaby · ₱795", "₱795", or "" */
export function ticketLine(label, amount) {
  return [label, amount != null ? (amount === 0 ? "Free" : peso(amount)) : ""].filter(Boolean).join(" · ");
}

/**
 * The registrant's (or an admin's) payment details.
 * @returns {{ value?: {method: string, reference: string, amount: number|null}, error?: string }}
 */
export function validateProof(input, { admin = false } = {}) {
  const methods = admin ? ADMIN_PAY_METHODS : PAY_METHODS;
  const method = Object.hasOwn(methods, input?.method) ? input.method : null;
  if (!method) return { error: "Pick how you paid." };
  const reference = cleanReference(input?.reference);
  if (reference === null) return { error: "The reference number should be letters and numbers, like 1012 345 678 901." };
  if (!reference && !(admin && (method === "cash" || method === "other"))) return { error: "Add the reference number from your receipt." };
  const amount = parsePeso(input?.amount);
  if (amount === undefined) return { error: "The amount should be in pesos, like 795." };
  return { value: { method, reference: reference || "", amount } };
}

/** A data URL from the browser → { mime, base64 } or an error. Size is checked by the caller on the decoded bytes. */
export function readProofImage(dataUrl, { label = "confirmation screenshot" } = {}) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return { error: `Add your ${label} (a PNG or JPG).` };
  if (Math.ceil((match[2].length * 3) / 4) > MAX_PROOF_BYTES) return { error: `That ${label} is too large. Try a normal photo from your phone.` };
  return { value: { mime: match[1], base64: match[2] } };
}

/** What the pass page shows for a registration on a paid event. */
export function passState(reg) {
  if (reg.status !== "confirmed") return reg.status;
  if (!reg.fee_required || !UNPAID.includes(reg.fee_status)) return "pass";
  return reg.fee_status; // waiting | review | rejected
}

/** "Offer prices in order": of the tickets on sale now (list order), only the first. */
export const inOrderTiers = (onSale) => (Array.isArray(onSale) ? openGroup(onSale, (t) => t) : []);

/** The first item on sale, plus the ones right after it marked "opens with the one above" (withPrevious). */
function openGroup(list, tierOf) {
  if (!list.length) return [];
  const group = [list[0]];
  for (const item of list.slice(1)) {
    if (!tierOf(item).withPrevious) break;
    group.push(item);
  }
  return group;
}

/** The RSVP's note about what comes after tier `i`: "Regular ₱1,950 once the first 20 are taken". */
export function nextTierNote(tiers, i) {
  const current = tiers?.[i];
  const next = tiers?.[i + 1];
  if (!current || !next) return "";
  const when = current.limit ? `once the first ${current.limit} are taken` : current.until ? `after ${tierWindow({ until: current.until }, 0).replace(/^Until /, "")}` : "";
  return when ? `${next.label || "The next rate"} ${next.amount === 0 ? "Free" : formatPeso(next.amount)} ${when}` : "";
}

/** With "Offer prices in order": the tickets open right now (the first on sale, plus any that open with it). */
export function openTiers(tiers, counts = {}, now = Date.now()) {
  return openGroup((tiers || []).filter((t) => tierAvailable(t, now, counts)), (t) => t);
}

/**
 * "Show later prices only once they open" (events.tiers_hide_later): the event page lists
 * the tiers up to the ones open now (earlier ones as ended), never the ones still to come.
 * With nothing on sale, every tier is listed.
 */
export function visibleTiers(tiers, counts = {}, now = Date.now()) {
  const list = tiers || [];
  const open = openTiers(list, counts, now);
  if (!open.length) return list;
  const last = Math.max(...open.map((t) => list.indexOf(t)));
  return list.slice(0, last + 1);
}
