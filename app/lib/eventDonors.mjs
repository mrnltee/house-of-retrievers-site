/**
 * Donor list per event (owner, 2026-11-02): who HOR asked for a cash donation for
 * an event, what they pledged or gave, and what their receipt and public thanks
 * need (the Cash Donation Form's fields). Pure functions, so they can be tested.
 */
export const DONOR_STATUSES = [
  ["asked", "Asked"],
  ["pledged", "Pledged"],
  ["received", "Received"],
  ["receipt_sent", "Receipt sent"],
  ["declined", "Declined"],
];
export const ASKED_VIA = [
  ["email", "Email letter"],
  ["instagram", "Instagram DM"],
  ["facebook", "Facebook DM"],
  ["in_person", "In person / call"],
  ["other", "Other"],
];
export const DONATION_METHODS = [
  ["bank", "Bank transfer"],
  ["gcash", "GCash"],
  ["cheque", "Cheque"],
  ["cash", "Cash"],
];
export const DONOR_LIMITS = { reference: 120, receiptName: 160, receiptAddress: 300, publicName: 160, notes: 1000 };

const pick = (list, value, fallback) => (list.some(([k]) => k === value) ? value : fallback);
const text = (value, max) => String(value ?? "").trim().slice(0, max) || null;
export const labelOf = (list, key) => list.find(([k]) => k === key)?.[1] || "";

/** One donor's details for one event, from the form. Returns { donor } or { error }. */
export function cleanEventDonor(f = {}) {
  const rawAmount = String(f.amount ?? "").replace(/[₱,\s]/g, "");
  if (rawAmount && !/^\d{1,9}$/.test(rawAmount)) return { error: "Type the amount in whole pesos, like 5000." };
  const amount = rawAmount ? Number(rawAmount) : null;
  const receivedOn = String(f.receivedOn ?? "").trim() || null;
  if (receivedOn && !/^\d{4}-\d{2}-\d{2}$/.test(receivedOn)) return { error: "Pick the date received from the calendar." };
  const status = pick(DONOR_STATUSES, f.status, "asked");
  if ((status === "received" || status === "receipt_sent") && !amount) return { error: "Add the amount received." };
  const acknowledge = f.acknowledge === "public" ? "public" : "private";
  const publicName = text(f.publicName, DONOR_LIMITS.publicName);
  if (acknowledge === "public" && !publicName) return { error: "Add the name to publish, or keep their name private." };
  return {
    donor: {
      status,
      askedVia: pick(ASKED_VIA, f.askedVia, "email"),
      amount,
      method: pick(DONATION_METHODS, f.method, null),
      receivedOn,
      reference: text(f.reference, DONOR_LIMITS.reference),
      receiptName: text(f.receiptName, DONOR_LIMITS.receiptName),
      receiptAddress: text(f.receiptAddress, DONOR_LIMITS.receiptAddress),
      acknowledge,
      publicName,
      notes: text(f.notes, DONOR_LIMITS.notes),
    },
  };
}

/** The numbers at the top of an event's donor list (pesos). */
export function donorCounts(rows = []) {
  const sum = (list) => list.reduce((total, r) => total + (Number(r.amount) || 0), 0);
  const gave = rows.filter((r) => r.status === "received" || r.status === "receipt_sent");
  return {
    donors: rows.length,
    asked: rows.filter((r) => r.status === "asked").length,
    pledged: sum(rows.filter((r) => r.status === "pledged")),
    received: sum(gave),
    gave: gave.length,
    receiptsDue: rows.filter((r) => r.status === "received").length,
    declined: rows.filter((r) => r.status === "declined").length,
  };
}
