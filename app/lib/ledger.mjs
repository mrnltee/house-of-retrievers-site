/**
 * Ledger and transparency report (owner, 22 Nov 2026). Pure rules, so they can be tested.
 *
 * The ledger is one list of lines. Some come from elsewhere and can't be edited here: paid registration fees
 * (net of refunds), cash donations from an event's Donors page, and brand cash / in-kind from its Brand
 * tracker. The rest are typed by the treasurer: expenses (receipt required), other income, in-kind items and
 * turnovers to beneficiaries (proof required). The report adds them up per event or for everything.
 *
 * Cash and in-kind are never added together: in-kind items and pledges are listed with their values but are
 * not money HoR holds.
 */

export const LEDGER_KINDS = [
  ["expense", "Expense"],
  ["income", "Other income"],
  ["in_kind", "In-kind item"],
  ["turnover", "Turnover to a beneficiary"],
];

export const EXPENSE_CATEGORIES = [
  ["venue", "Venue"],
  ["food", "Food & drinks"],
  ["supplies", "Supplies & materials"],
  ["printing", "Printing & signage"],
  ["transport", "Transport & logistics"],
  ["marketing", "Marketing & ads"],
  ["professional", "Professional fees"],
  ["permits", "Permits & fees"],
  ["prizes", "Prizes & giveaways"],
  ["tokens", "Tokens & certificates"],
  ["bank_fees", "Bank & payment fees"],
  ["other", "Other"],
];

export const INCOME_CATEGORIES = [
  ["donation_box", "On-site donations"],
  ["sales", "Merchandise & sales"],
  ["fees_other", "Fees paid outside the RSVP"],
  ["grant", "Grant"],
  ["other", "Other income"],
];

export const IN_KIND_CATEGORIES = [
  ["food", "Food & treats"],
  ["supplies", "Supplies & goods"],
  ["services", "Services"],
  ["venue", "Venue"],
  ["prizes", "Prizes & giveaways"],
  ["other", "Other"],
];

export const TURNOVER_CATEGORIES = [
  ["cash", "Cash"],
  ["goods", "Goods"],
];

export const LEDGER_METHODS = [
  ["bank", "Bank transfer"],
  ["gcash", "GCash"],
  ["cheque", "Cheque"],
  ["cash", "Cash"],
  ["card", "Card"],
  ["other", "Other"],
];

export const CATEGORIES = { expense: EXPENSE_CATEGORIES, income: INCOME_CATEGORIES, in_kind: IN_KIND_CATEGORIES, turnover: TURNOVER_CATEGORIES };
export const LEDGER_LIMITS = { description: 300, party: 160, quantity: 60, reference: 120, notes: 1000 };

export const labelOf = (list, key) => list.find(([k]) => k === key)?.[1] || "";
export const categoryLabel = (kind, key) => labelOf(CATEGORIES[kind] || [], key) || "Other";

/** Expenses and turnovers count only with proof attached (a receipt, or the beneficiary's acknowledgement). */
export const needsProof = (kind) => kind === "expense" || kind === "turnover";

const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));
const text = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max) || null;

/** Whole pesos from "₱2,450" / "2450" / "2450.00"; "" stays empty; anything else is refused. */
export function readPesos(value) {
  const raw = String(value ?? "").replace(/[₱,\s]|PHP/gi, "");
  if (!raw) return { amount: null };
  const m = raw.match(/^(\d{1,9})(?:\.(\d{1,2}))?$/);
  if (!m) return { error: "Type the amount in pesos, like 2450." };
  if (m[2] && !/^0+$/.test(m[2])) return { error: "Round the amount to whole pesos (the ledger doesn't keep centavos)." };
  return { amount: Number(m[1]) };
}

/** One typed ledger line, from the form. Returns { entry } or { error }. */
export function cleanEntry(f = {}) {
  const kind = LEDGER_KINDS.some(([k]) => k === f.kind) ? f.kind : null;
  if (!kind) return { error: "Choose what kind of line this is." };
  const date = String(f.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick the date from the calendar." };
  const category = (CATEGORIES[kind] || []).some(([k]) => k === f.category) ? f.category : null;
  if (!category) return { error: "Choose a category." };
  const description = text(f.description, LEDGER_LIMITS.description);
  if (!description) return { error: kind === "expense" ? "Say what the expense was for." : "Add a short description." };
  const { amount, error } = readPesos(f.amount);
  if (error) return { error };
  if (kind !== "in_kind" && !(amount > 0)) return { error: "Add the amount." };
  const beneficiaryId = kind === "turnover" && isUuid(f.beneficiary) ? f.beneficiary : null;
  const party = text(f.party, LEDGER_LIMITS.party);
  if (kind === "turnover" && !beneficiaryId && !party) return { error: "Choose the beneficiary it went to." };
  const method = LEDGER_METHODS.some(([k]) => k === f.method) ? f.method : null;
  return {
    entry: {
      kind,
      eventId: isUuid(f.event) ? f.event : null,
      date,
      category,
      description,
      party,
      beneficiaryId,
      amount,
      quantity: kind === "in_kind" ? text(f.quantity, LEDGER_LIMITS.quantity) : null,
      method: kind === "in_kind" || (kind === "turnover" && category === "goods") ? null : method,
      reference: text(f.reference, LEDGER_LIMITS.reference),
      // Givers of income and in-kind items can stay unnamed in the report, like donors.
      showName: kind === "income" || kind === "in_kind" ? f.showName === "on" || f.showName === true : true,
      notes: String(f.notes ?? "").trim().slice(0, LEDGER_LIMITS.notes) || null,
    },
  };
}

/**
 * Every line of the ledger, from its sources. Each line: { id, source, kind, eventId, date, category,
 * description, party, amount, showName, proofs, checked, href }. `kind` is one of income, expense, in_kind,
 * turnover or pledge (pledges are listed, never counted).
 */
export function ledgerLines({ entries = [], fees = [], donations = [], brands = [] } = {}) {
  const lines = [];
  for (const e of entries) {
    lines.push({
      id: e.id, source: "manual", kind: e.kind, eventId: e.event_id || null, date: e.entry_date, category: e.category,
      description: e.description, party: e.beneficiary_name || e.party || "", amount: e.amount == null ? null : Number(e.amount),
      quantity: e.quantity || "", method: e.method || "", reference: e.reference || "", showName: e.show_name !== false,
      proofs: Number(e.files || 0), notes: e.notes || "",
    });
  }
  for (const f of fees) {
    const amount = Number(f.amount) || 0;
    if (!amount) continue;
    lines.push({ id: `fees-${f.event_id}`, source: "fees", kind: "income", eventId: f.event_id, date: f.date, category: "fees", count: Number(f.count) || 0, refunded: Number(f.refunded) || 0, description: `Registration fees · ${f.count} paid${Number(f.refunded) ? ` (net of ₱${Number(f.refunded).toLocaleString("en-PH")} refunded)` : ""}`, party: "", amount, showName: true, proofs: 0 });
  }
  for (const d of donations) {
    const amount = Number(d.amount) || 0;
    if (!amount) continue;
    const pledge = d.status === "pledged";
    if (!pledge && d.status !== "received" && d.status !== "receipt_sent") continue;
    lines.push({
      id: `donation-${d.event_id}-${d.contact_id}`, source: "donation", kind: pledge ? "pledge" : "income", eventId: d.event_id,
      date: d.received_on || d.date, category: "donation", description: pledge ? "Cash donation pledged" : "Cash donation",
      party: d.name || "", publicName: d.acknowledge === "public" ? d.public_name || "" : "", showName: d.acknowledge === "public",
      amount, method: d.method || "", reference: d.reference || "", checked: Boolean(d.verified_at), proofs: Number(d.proofs || 0),
    });
  }
  for (const b of brands) {
    if (b.reply !== "yes") continue;
    const base = { eventId: b.event_id, date: b.date, party: b.name || "", showName: true, showAmount: Boolean(b.show_amounts), proofs: 0 };
    if (Number(b.cash_amount) > 0) lines.push({ ...base, id: `brand-cash-${b.event_id}-${b.supporter_id}`, source: "brand", kind: "income", category: "brand_cash", description: `${b.role || "Brand"} cash`, amount: Number(b.cash_amount) });
    if (Number(b.in_kind_value) > 0 || b.in_kind_note) lines.push({ ...base, id: `brand-kind-${b.event_id}-${b.supporter_id}`, source: "brand", kind: "in_kind", category: "brand_kind", description: b.in_kind_note || "In-kind support", amount: Number(b.in_kind_value) || null });
  }
  return lines.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || a.description.localeCompare(b.description));
}

const sum = (list) => list.reduce((total, l) => total + (Number(l.amount) || 0), 0);

/** Cash in, spent, turned over and held, plus in-kind and pledges (listed, not counted), for some lines. */
export function ledgerTotals(lines = []) {
  const of = (kind) => lines.filter((l) => l.kind === kind);
  const cashIn = sum(of("income"));
  const spent = sum(of("expense"));
  const turnedOver = sum(of("turnover").filter((l) => l.category === "cash"));
  return {
    cashIn,
    spent,
    net: cashIn - spent,
    turnedOver,
    held: cashIn - spent - turnedOver,
    goodsTurnedOver: sum(of("turnover").filter((l) => l.category === "goods")),
    inKind: sum(of("in_kind")),
    inKindUnvalued: of("in_kind").filter((l) => !(Number(l.amount) > 0)).length,
    pledged: sum(of("pledge")),
    donationsToCheck: sum(lines.filter((l) => l.source === "donation" && l.kind === "income" && !l.checked)),
    missingProof: lines.filter((l) => l.source === "manual" && needsProof(l.kind) && !(l.proofs > 0)).length,
  };
}

const INCOME_SOURCES = [
  ["fees", "Registration fees"],
  ["donation", "Cash donations"],
  ["brand_cash", "Partner & sponsor cash"],
  ...INCOME_CATEGORIES,
];

/**
 * The transparency report for some lines (one event, or all). Donors who asked to stay private are never
 * named; brand amounts show per brand only where the Brand tracker says they're OK to show. Expenses are
 * listed line by line under their category. Returns sections ready to print.
 */
export function transparencyReport(lines = []) {
  const totals = ledgerTotals(lines);
  const income = INCOME_SOURCES.map(([key, label]) => {
    const list = lines.filter((l) => l.kind === "income" && l.category === key);
    if (!list.length) return null;
    let items = [];
    if (key === "donation") {
      const named = list.filter((l) => l.showName && l.publicName).map((l) => l.publicName);
      const unnamed = list.length - named.length;
      items = [{ label: `${list.length} donor${list.length === 1 ? "" : "s"}${named.length ? `, with thanks to ${named.join(", ")}${unnamed ? ` and ${unnamed} who asked not to be named` : ""}` : ", who asked not to be named"}`, amount: null }];
    } else if (key === "brand_cash") {
      const shown = list.filter((l) => l.showAmount);
      const hidden = list.filter((l) => !l.showAmount);
      // A brand that didn't agree to show its amount is never shown alone: private amounts show only as a group of two or more.
      items = [...shown.map((l) => ({ label: l.party, amount: l.amount })), ...(hidden.length ? [{ label: hidden.map((l) => l.party).join(", "), amount: shown.length && hidden.length > 1 ? sum(hidden) : null }] : [])];
    } else if (key !== "fees") {
      items = list.map((l) => ({ label: [l.description, l.showName && l.party ? l.party : ""].filter(Boolean).join(" · "), amount: l.amount }));
    } else {
      // One line for all paid registrations; the By event table splits them per event.
      const paid = list.reduce((n, l) => n + (Number(l.count) || 0), 0);
      const refunded = list.reduce((n, l) => n + (Number(l.refunded) || 0), 0);
      items = [{ label: `${paid} paid registration${paid === 1 ? "" : "s"}${refunded ? `, net of ₱${refunded.toLocaleString("en-PH")} refunded` : ""}`, amount: null }];
    }
    return { key, label, amount: sum(list), items };
  }).filter(Boolean);
  const expenses = EXPENSE_CATEGORIES.map(([key, label]) => {
    const list = lines.filter((l) => l.kind === "expense" && l.category === key);
    if (!list.length) return null;
    return { key, label, amount: sum(list), items: list.map((l) => ({ date: l.date, label: l.description, party: l.party, amount: l.amount, proofs: l.proofs })) };
  }).filter(Boolean);
  const turnovers = lines.filter((l) => l.kind === "turnover").map((l) => ({ date: l.date, label: l.party || l.description, form: l.category, description: l.description, amount: l.amount }));
  const inKind = lines.filter((l) => l.kind === "in_kind").map((l) => ({ label: l.description, quantity: l.quantity || "", party: l.showName ? l.party : "Someone who asked not to be named", amount: l.source === "brand" && !l.showAmount ? null : l.amount }));
  const pledges = lines.filter((l) => l.kind === "pledge");
  return {
    totals,
    income,
    expenses,
    turnovers,
    inKind,
    pledges: pledges.length ? { count: pledges.length, amount: sum(pledges) } : null,
  };
}

/** For an all-events report: one row per event (and one for general lines), newest event first. */
export function eventBreakdown(lines = [], events = []) {
  const order = new Map(events.map((e, i) => [e.id, i]));
  const ids = [...new Set(lines.map((l) => l.eventId || ""))];
  return ids
    .map((id) => ({ id, title: id ? events.find((e) => e.id === id)?.title || "Event" : "Not tied to an event", date: id ? events.find((e) => e.id === id)?.date || "" : "", ...ledgerTotals(lines.filter((l) => (l.eventId || "") === id)) }))
    .sort((a, b) => (a.id ? order.get(a.id) ?? 1e9 : 1e9) - (b.id ? order.get(b.id) ?? 1e9 : 1e9));
}
