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

/**
 * Donation tracker (owner, 22 Nov 2026). The table's columns, in order; the admin picks which show (saved per
 * device). Donor always shows. `on` = shown until the admin changes it.
 */
export const DONOR_COLUMNS = [
  { key: "asked", label: "Asked by", on: false },
  { key: "status", label: "Status", on: true },
  { key: "amount", label: "Amount", on: true },
  { key: "checked", label: "Checked", on: true },
  { key: "method", label: "Method", on: true },
  { key: "date", label: "Received on", on: true },
  { key: "reference", label: "Reference", on: true },
  { key: "proof", label: "Proof", on: true },
  { key: "form", label: "Form", on: true },
  { key: "receipt", label: "Receipt name", on: false },
  { key: "address", label: "Mailing address", on: false },
  { key: "thanks", label: "Thanks", on: false },
  { key: "notes", label: "Notes", on: false },
];

const GAVE = new Set(["received", "receipt_sent"]);
/** A donation that counts as money in: received or receipt sent, with an amount. */
export const gaveMoney = (r) => GAVE.has(r.status) && Number(r.amount) > 0;

/**
 * The proceeds: everything received, split into checked against HoR's account (with proof) and still to
 * check, plus pledges not in yet and a breakdown by method. `proofs` maps contact id to its number of
 * proof files.
 */
export function donationTotals(rows = [], proofs = {}) {
  const sum = (list) => list.reduce((total, r) => total + (Number(r.amount) || 0), 0);
  const gave = rows.filter(gaveMoney);
  const checked = gave.filter((r) => r.verified_at);
  const unchecked = gave.filter((r) => !r.verified_at);
  const byMethod = [...DONATION_METHODS, ["", "Method not set"]]
    .map(([key, label]) => {
      const list = gave.filter((r) => (r.method || "") === key);
      return { key, label, count: list.length, amount: sum(list) };
    })
    .filter((m) => m.count);
  return {
    received: sum(gave),
    receivedCount: gave.length,
    checked: sum(checked),
    checkedCount: checked.length,
    toCheck: sum(unchecked),
    toCheckCount: unchecked.length,
    noProofCount: gave.filter((r) => !(proofs[r.id] > 0)).length,
    pledged: sum(rows.filter((r) => r.status === "pledged")),
    pledgedCount: rows.filter((r) => r.status === "pledged").length,
    byMethod,
  };
}

/**
 * Whether a save may mark a donation as checked against HoR's account history. Only a received donation
 * with an amount and at least one proof of payment, by an admin who may check payments.
 */
export function checkProblem({ status, amount, proofCount = 0, mayCheck = false }) {
  if (!mayCheck) return "Only admins who check payments can mark a donation as checked.";
  if (!GAVE.has(status)) return "Set the status to Received before marking it as checked.";
  if (!(Number(amount) > 0)) return "Add the amount received before marking it as checked.";
  if (!(proofCount > 0)) return "Attach the proof of payment before marking it as checked.";
  return "";
}

/** Donors whose reference number is the same as another donor's on this event: contact id to the others' names. */
export function sameReferences(rows = []) {
  const key = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const by = new Map();
  for (const r of rows) if (key(r.reference)) by.set(key(r.reference), [...(by.get(key(r.reference)) || []), r]);
  const out = {};
  for (const list of by.values()) if (list.length > 1) for (const r of list) out[r.id] = list.filter((o) => o !== r).map((o) => o.name);
  return out;
}
