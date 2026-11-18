import { COMP_TYPES, compLabel } from "./compTickets.mjs";

/**
 * The Registrations list's ticket filter (owner, 18 Nov 2026): Complimentary (and its Guest / VIP / Organizer
 * types), then each ticket by name (Early Bird, Regular…). Combined with the Paid tab it gives "Early Bird, paid".
 * A row carries its keys in data-ticket, space-separated; the filter matches one key.
 */
const norm = (label) => String(label || "").trim().replace(/\s+/g, " ").toLowerCase();

export function ticketKeys(reg = {}) {
  if (reg.comp_type) return ["comp", `comp:${reg.comp_type}`];
  const name = norm(reg.ticket_label);
  return name ? [`t:${name.replace(/ /g, "-")}`] : ["none"];
}

/** [[key, label, count]] for the rows given, in a fixed order: complimentary first, tickets as first seen, no ticket last. */
export function ticketGroups(rows = []) {
  const comp = new Map();
  const tickets = new Map();
  let none = 0;
  for (const r of rows) {
    if (r.comp_type) comp.set(r.comp_type, (comp.get(r.comp_type) || 0) + 1);
    else if (norm(r.ticket_label)) {
      const key = ticketKeys(r)[0];
      const t = tickets.get(key) || { label: String(r.ticket_label).trim().replace(/\s+/g, " "), n: 0 };
      t.n += 1;
      tickets.set(key, t);
    } else none += 1;
  }
  const out = [];
  const compTotal = [...comp.values()].reduce((a, b) => a + b, 0);
  if (comp.size === 1) {
    const [[type, n]] = [...comp];
    out.push(["comp", `Complimentary · ${compLabel(type) || type}`, n]);
  } else if (comp.size > 1) {
    out.push(["comp", "Complimentary", compTotal]);
    for (const { key } of COMP_TYPES) if (comp.has(key)) out.push([`comp:${key}`, `Complimentary · ${compLabel(key)}`, comp.get(key)]);
  }
  for (const [key, { label, n }] of tickets) out.push([key, label, n]);
  if (none) out.push(["none", "No ticket (waitlist)", none]);
  return out;
}
