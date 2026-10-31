/**
 * Importing a spreadsheet (Excel or CSV) into Sponsors & partners, an event's
 * registrations, or People (owner, 2026-10-27). The browser reads the file;
 * its columns are matched to a record's fields by name (the admin can change
 * any match), then each row is checked with the same rules as the Add forms.
 * Rows that match an existing record are skipped and listed, never changed,
 * and nothing is emailed.
 */
import { AGREEMENT_STATUSES, GIVES, INVITE_STATUSES, KINDS as SUPPORTER_KINDS, RSVP_STATUSES, STATUSES, TIERS } from "../supporters.mjs";
import { PEOPLE_KINDS, PEOPLE_STATUSES } from "./people.mjs";

export const MAX_IMPORT_ROWS = 500;

/**
 * The fields each import fills. `aliases` are lower-case header words that
 * match the field (a header matches when it equals or starts with one).
 */
export const IMPORT_TARGETS = {
  supporters: {
    title: "Sponsors & partners",
    fields: [
      { key: "name", label: "Name", required: true, aliases: ["name", "company", "organization", "organisation", "brand", "business name", "sponsor", "partner"] },
      { key: "kind", label: "Type (Sponsor or Partner)", aliases: ["type", "kind", "category"], hint: "Sponsor if blank" },
      { key: "status", label: "Status", aliases: ["status", "stage"], hint: "Inquiry, Talking, Confirmed or Ended; Inquiry if blank" },
      { key: "tier", label: "Tier", aliases: ["tier", "level", "package"] },
      { key: "code", label: "ID code (4 letters)", aliases: ["id code", "code", "id"], hint: "Needed for Confirmed ones, e.g. NVTL" },
      { key: "contactName", label: "Contact name", aliases: ["contact name", "contact person", "contact", "representative"] },
      { key: "contactEmail", label: "Contact email", aliases: ["contact email", "email", "e-mail"] },
      { key: "contactPhone", label: "Contact phone", aliases: ["contact phone", "phone", "mobile", "contact number", "number"] },
      { key: "link", label: "IG or website (one column)", aliases: ["ig / website", "ig/website", "instagram / website", "website / ig", "social / website"], hint: "Sorted into Instagram or Website; anything else goes to Notes" },
      { key: "website", label: "Website", aliases: ["website", "site", "url", "web"] },
      { key: "instagram", label: "Instagram", aliases: ["instagram", "ig", "social"] },
      { key: "gives", label: "What they give", aliases: ["gives", "support type", "contribution type"], hint: "Cash, In-kind, Services, Venue, Booth (comma-separated)" },
      { key: "participation", label: "Participation type", aliases: ["participation type", "participation"], hint: "Brand Booth, Item Donation, Cash Donation, Booth + Donation or Other; added to What they give" },
      { key: "booth", label: "Booth requested?", aliases: ["booth requested", "booth?"], hint: "Yes adds Booth to What they give" },
      { key: "cashAmount", label: "Cash amount (₱)", aliases: ["cash amount", "booth fee", "cash", "amount"] },
      { key: "inKindValue", label: "In-kind value (₱)", aliases: ["in-kind value", "in kind value", "cash / in-kind value", "cash/in-kind value", "in-kind"], hint: "Counted as cash when the participation is Cash Donation" },
      { key: "inKindNote", label: "In-kind note", aliases: ["in-kind note", "in kind note", "item donation details", "item donation", "items"] },
      { key: "itemQty", label: "Quantity of items", aliases: ["quantity of items", "quantity", "qty"], hint: "Added to the in-kind note" },
      { key: "inviteStatus", label: "Invitation status", aliases: ["invitation status", "invite status", "invitation"], hint: INVITE_STATUSES.map(([, l]) => l).join(", ") },
      { key: "invitedOn", label: "Invitation date", aliases: ["invitation date", "invited on", "date invited"] },
      { key: "followUpOn", label: "Follow-up date", aliases: ["follow-up date", "follow up date", "follow-up", "follow up"] },
      { key: "rsvpStatus", label: "RSVP status", aliases: ["rsvp status", "rsvp"], hint: RSVP_STATUSES.map(([, l]) => l).join(", ") },
      { key: "agreementStatus", label: "Agreement status", aliases: ["agreement status", "agreement", "contract status"], hint: AGREEMENT_STATUSES.map(([, l]) => l).join(", ") },
      { key: "assignedTo", label: "Assigned team member", aliases: ["assigned team member", "assigned to", "assigned", "team member"] },
      { key: "boothNeeds", label: "Booth requirements", aliases: ["booth requirements", "booth needs"] },
      { key: "repsAttending", label: "Representatives attending", aliases: ["representatives attending", "reps attending", "expected hoomans", "expected humans"] },
      { key: "dogsAttending", label: "Dogs attending", aliases: ["dogs attending", "expected dogs"] },
      { key: "supportYear", label: "Year", aliases: ["year", "support year"] },
      { key: "categoryLabel", label: "Relationship label", aliases: ["relationship", "label", "role"] },
      { key: "blurb", label: "Short blurb", aliases: ["blurb", "description", "about"] },
      { key: "notes", label: "Notes", aliases: ["notes", "note", "remarks", "comments"] },
    ],
  },
  registrations: {
    title: "Registrations",
    fields: [
      { key: "name", label: "Name", required: true, aliases: ["name", "full name", "registrant", "participant", "hooman", "guest"] },
      { key: "email", label: "Email", required: true, aliases: ["email", "e-mail", "email address"] },
      { key: "furbabyName", label: "Furbaby name(s)", aliases: ["furbaby", "dog", "pet", "dog name", "furbaby name"] },
      { key: "humanCount", label: "Hoomans", aliases: ["hoomans", "humans", "people", "adults", "guests", "pax"], hint: "1 if blank" },
      { key: "furbabyCount", label: "Furbabies", aliases: ["furbabies", "dogs", "pets", "number of dogs"], hint: "0 if blank" },
      { key: "ticket", label: "Ticket", aliases: ["ticket", "tier", "rate", "ticket type"], hint: "Matched to the event's ticket names; the first ticket if blank" },
      { key: "payment", label: "Payment", aliases: ["payment", "payment status", "paid", "status"], hint: "Paid, Pending or blank" },
      { key: "method", label: "Paid by", aliases: ["method", "payment method", "paid by", "mode of payment"] },
      { key: "reference", label: "Payment reference", aliases: ["reference", "ref", "reference number", "transaction"] },
      { key: "amount", label: "Amount paid (₱)", aliases: ["amount paid", "amount", "paid amount"] },
      { key: "photoConsent", label: "Photos OK", aliases: ["photo", "photo consent", "photos"], hint: "Yes or No; No if blank" },
      { key: "under18", label: "Under 18", aliases: ["under 18", "minor", "under18"] },
      { key: "guardianName", label: "Guardian name", aliases: ["guardian", "parent", "guardian name"] },
    ],
  },
  people: {
    title: "People",
    fields: [
      { key: "name", label: "Name", required: true, aliases: ["name", "full name"] },
      { key: "email", label: "Email", required: true, aliases: ["email", "e-mail", "email address"] },
      { key: "kind", label: "Join type", required: true, aliases: ["join type", "type", "kind", "interest"], hint: "Member, Volunteer, Sponsor or Partner" },
      { key: "organization", label: "Organization", aliases: ["organization", "organisation", "company"] },
      { key: "socialProfile", label: "Social profile", aliases: ["social", "instagram", "facebook", "handle"] },
      { key: "furbabyName", label: "Furbaby name", aliases: ["furbaby", "dog", "pet"] },
      { key: "status", label: "Status", aliases: ["status"] },
      { key: "message", label: "Message", aliases: ["message"] },
      { key: "notes", label: "Notes", aliases: ["notes", "note", "remarks"] },
    ],
  },
};

const norm = (text) => String(text ?? "").toLowerCase().replace(/[_*:]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Header → field matches: { fieldKey: columnIndex }. Exact alias matches win
 * over "starts with", and each column is used once.
 */
export function autoMatch(headers, target) {
  const fields = IMPORT_TARGETS[target]?.fields || [];
  const heads = headers.map(norm);
  const used = new Set();
  const match = {};
  for (const pass of ["exact", "prefix"]) {
    for (const field of fields) {
      if (match[field.key] !== undefined) continue;
      const i = heads.findIndex((h, n) => !used.has(n) && h && [field.key.toLowerCase(), ...field.aliases].some((a) => (pass === "exact" ? h === a : h.startsWith(a))));
      if (i >= 0) { match[field.key] = i; used.add(i); }
    }
  }
  return match;
}

/** A cell as text: dates as YYYY-MM-DD, numbers without trailing zeros. */
export function cellText(cell) {
  if (cell == null) return "";
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? "" : cell.toISOString().slice(0, 10);
  if (typeof cell === "boolean") return cell ? "yes" : "no";
  return String(cell).trim();
}

/** Sheet rows (header first) + matches → [{ line, fields: { key: text } }], blank rows dropped. */
export function mapRows(rows, match) {
  return rows.slice(1).map((row, n) => ({
    line: n + 2,
    fields: Object.fromEntries(Object.entries(match).filter(([, i]) => i != null && i >= 0).map(([key, i]) => [key, cellText(row[i])])),
  })).filter((r) => Object.values(r.fields).some((v) => v !== ""));
}

const pick = (list, text) => {
  const t = norm(text);
  if (!t) return "";
  const hit = list.find(([key, label]) => norm(key) === t || norm(label) === t);
  return hit ? hit[0] : null;
};
const yesNo = (text) => {
  const t = norm(text);
  if (!t) return "";
  if (["yes", "y", "true", "1", "ok", "agree", "agreed"].includes(t)) return "yes";
  if (["no", "n", "false", "0", "not ok", "disagree"].includes(t)) return "no";
  return null;
};
const pesoText = (text) => String(text ?? "").replace(/[₱,\s]|php/gi, "");

/** Brand Tracker "Participation Type" → what it adds to "What they give". */
const PARTICIPATION = {
  "brand booth": ["booth"], booth: ["booth"], "item donation": ["in-kind"], "cash donation": ["cash"],
  "booth + donation": ["booth"], other: [],
};

/** A sheet date: YYYY-MM-DD (Excel dates arrive like this) or M/D/YYYY. "" when blank, null when unreadable. */
export function sheetDate(text) {
  const t = String(text ?? "").trim();
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

/** Excel keeps 0917… numbers as 9170000000 (or 9.17E9): give the 0 back. */
export function phoneText(text) {
  let t = String(text ?? "").trim();
  if (/^\d(\.\d+)?e\+?\d+$/i.test(t)) t = String(Math.round(Number(t)));
  return /^9\d{9}$/.test(t) ? `0${t}` : t;
}

/** One "IG / Website" cell → { instagram } or { website }; anything else is kept as { note }. */
export function sortLink(text) {
  const t = String(text ?? "").trim();
  if (!t || /^[`'"\-–—.]+$/.test(t)) return {};
  if (/instagram\.com\//i.test(t) || /^@[A-Za-z0-9._]{1,30}$/.test(t)) return { instagram: t };
  if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(t)) return { website: t };
  return { note: t };
}

/**
 * Turns a mapped sheet row into the input the record's own checker expects.
 * Returns { input } or { error } (in plain words, for the preview).
 */
export function rowInput(target, fields, { tickets = [] } = {}) {
  const f = (key) => fields[key] ?? "";
  if (target === "supporters") {
    const kind = f("kind") ? SUPPORTER_KINDS.find((k) => norm(k) === norm(f("kind"))) : "Sponsor";
    if (!kind) return { error: `Type "${f("kind")}" isn't Sponsor or Partner` };
    const status = pick(STATUSES, f("status"));
    if (status === null) return { error: `Status "${f("status")}" isn't Inquiry, Talking, Confirmed or Ended` };
    const tier = pick(TIERS, f("tier"));
    if (tier === null) return { error: `Tier "${f("tier")}" isn't one of ${TIERS.map(([, l]) => l).join(", ")}` };
    const gives = f("gives") ? f("gives").split(/[,;/]+/).map((g) => pick(GIVES, g)) : [];
    if (gives.includes(null)) return { error: `"What they give" should list ${GIVES.map(([, l]) => l).join(", ")}` };
    const takes = PARTICIPATION[norm(f("participation")).replace(/\s*\+\s*/g, " + ")];
    if (f("participation") && !takes) return { error: `Participation type "${f("participation")}" should be Brand Booth, Item Donation, Cash Donation, Booth + Donation or Other` };
    const booth = yesNo(f("booth"));
    if (booth === null) return { error: `Booth requested "${f("booth")}" should be Yes or No` };
    for (const g of [...(takes || []), ...(booth === "yes" ? ["booth"] : [])]) if (!gives.includes(g)) gives.push(g);
    const outreach = {};
    for (const [key, list, name] of [["inviteStatus", INVITE_STATUSES, "Invitation status"], ["rsvpStatus", RSVP_STATUSES, "RSVP status"], ["agreementStatus", AGREEMENT_STATUSES, "Agreement status"]]) {
      outreach[key] = pick(list, f(key));
      if (outreach[key] === null) return { error: `${name} "${f(key)}" should be ${list.map(([, l]) => l).join(", ")}` };
    }
    for (const [key, name] of [["invitedOn", "Invitation date"], ["followUpOn", "Follow-up date"]]) {
      outreach[key] = sheetDate(f(key));
      if (outreach[key] === null) return { error: `${name} "${f(key)}" isn't a date; use 2026-11-05 or 11/5/2026` };
    }
    const link = sortLink(f("link"));
    const qty = f("itemQty").replace(/\.0+$/, "");
    let cash = pesoText(f("cashAmount"));
    let inKind = pesoText(f("inKindValue"));
    if (takes?.includes("cash") && !takes.includes("in-kind") && inKind && !cash) [cash, inKind] = [inKind, ""];
    // A cell with two emails: the first is the contact, the others go to Notes
    // (so does a note typed in the email column, like "declined").
    const emails = f("contactEmail").match(/[^\s@,;:<>()]+@[^\s@,;:<>()]+\.[A-Za-z]{2,}/g) || [];
    const notes = [f("notes"), link.note && `IG / Website: ${link.note}`, emails.length > 1 && `Other emails: ${emails.slice(1).join(", ")}`, !emails.length && f("contactEmail") && `Email column: ${f("contactEmail")}`].filter(Boolean).join("\n");
    return {
      input: {
        name: f("name"), kind, status: status || "inquiry", tier: tier || "", gives, code: f("code"),
        contactName: f("contactName"), contactEmail: emails[0] || "", contactPhone: phoneText(f("contactPhone")),
        website: f("website") || link.website || "", instagram: f("instagram") || link.instagram || "", cashAmount: cash, inKindValue: inKind,
        inKindNote: [f("inKindNote"), qty && `×${qty}`].filter(Boolean).join(" "), supportYear: f("supportYear"), categoryLabel: f("categoryLabel"), blurb: f("blurb"), notes,
        ...outreach, assignedTo: f("assignedTo"), boothNeeds: f("boothNeeds"),
        repsAttending: f("repsAttending").replace(/\.0+$/, ""), dogsAttending: f("dogsAttending").replace(/\.0+$/, ""),
      },
    };
  }
  if (target === "registrations") {
    const photo = yesNo(f("photoConsent"));
    if (photo === null) return { error: `Photos OK "${f("photoConsent")}" should be Yes or No` };
    const minor = yesNo(f("under18"));
    if (minor === null) return { error: `Under 18 "${f("under18")}" should be Yes or No` };
    let ticket = tickets.length ? "0" : ""; // the first ticket when the sheet has none
    if (f("ticket") && tickets.length) {
      const i = tickets.findIndex((t) => norm(t.label) === norm(f("ticket")));
      if (i < 0) return { error: `Ticket "${f("ticket")}" isn't one of this event's: ${tickets.map((t) => t.label).join(", ")}` };
      ticket = String(i);
    }
    const pay = norm(f("payment"));
    const payment = !pay ? "none" : ["paid", "yes", "done", "confirmed"].includes(pay) ? "paid" : ["pending", "unpaid", "waiting", "to pay", "no"].includes(pay) ? "pending" : null;
    if (!payment) return { error: `Payment "${f("payment")}" should be Paid, Pending or blank` };
    const method = norm(f("method")).replace(/\s+/g, "");
    return {
      input: {
        name: f("name"), email: f("email"), furbabyName: f("furbabyName"),
        humanCount: f("humanCount") || "1", furbabyCount: f("furbabyCount") || "0",
        ticket, payment, method: ["bank", "banktransfer"].includes(method) ? "bank" : method, reference: f("reference"), amount: pesoText(f("amount")),
        photoConsent: photo || "no", under18: minor === "yes", guardianName: f("guardianName"),
      },
    };
  }
  if (target === "people") {
    const kind = PEOPLE_KINDS.find((k) => norm(k) === norm(f("kind")));
    if (!kind) return { error: `Join type "${f("kind")}" should be ${PEOPLE_KINDS.join(", ")}` };
    const status = PEOPLE_STATUSES[kind].find((s) => norm(s) === norm(f("status")));
    if (f("status") && !status) return { error: `Status "${f("status")}" isn't one of ${PEOPLE_STATUSES[kind].join(", ")}` };
    const email = f("email").toLowerCase();
    if (!f("name")) return { error: "No name" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "No valid email" };
    return {
      input: {
        kind, name: f("name").slice(0, 120), email: email.slice(0, 200), status: status || "New",
        organization: f("organization").slice(0, 160) || null, socialProfile: f("socialProfile").slice(0, 300) || null,
        furbabyName: f("furbabyName").slice(0, 120) || null, message: f("message").slice(0, 2000) || null, notes: f("notes").slice(0, 500) || null,
      },
    };
  }
  return { error: "Unknown import" };
}
