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
 * No time limit on holds. Payments are non-refundable (charity events).
 * Pure functions: shared by the routes, the admin and the tests.
 */

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

export const NO_REFUND = "Payments are non-refundable. This is a charity event, so every peso goes to the cause.";
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
 * ([{label, amount}], see eventTiers); `index` is the chosen one. With one
 * tier (or none) there is nothing to choose.
 * @returns {{ value?: {label: string|null, amount: number|null}, error?: string }}
 */
export function chooseTicket(tiers, index) {
  const list = Array.isArray(tiers) ? tiers : [];
  if (list.length === 0) return { value: { label: null, amount: null } };
  if (list.length === 1) return { value: { label: list[0].label || null, amount: list[0].amount ?? null } };
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return { error: "Pick a ticket." };
  return { value: { label: list[i].label || null, amount: list[i].amount ?? null } };
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
export function readProofImage(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return { error: "Add your confirmation screenshot (a PNG or JPG)." };
  if (Math.ceil((match[2].length * 3) / 4) > MAX_PROOF_BYTES) return { error: "That screenshot is too large. Try a normal screenshot from your phone." };
  return { value: { mime: match[1], base64: match[2] } };
}

/** What the pass page shows for a registration on a paid event. */
export function passState(reg) {
  if (reg.status !== "confirmed") return reg.status;
  if (!reg.fee_required || !UNPAID.includes(reg.fee_status)) return "pass";
  return reg.fee_status; // waiting | review | rejected
}
