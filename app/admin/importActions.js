"use server";

import { revalidatePath } from "next/cache";
import { sql, transaction } from "../lib/db";
import { actionAdmin } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { IMPORT_TARGETS, MAX_IMPORT_ROWS, rowInput } from "../lib/admin/sheetImport.mjs";
import { supporterSlug, validateSupporter } from "../lib/supporters.mjs";
import { newCheckInCode, validateRsvp } from "../lib/admin/registrations.mjs";
import { eventTiers } from "../lib/admin/events.mjs";
import { chooseTicket, owesPayment, validateProof } from "../lib/eventPayments.mjs";
import { calculateAmountDue, cleanAttendeeCounts, cleanPricingBasis } from "../lib/registrationPricing.mjs";
import { validateCapacityCounts } from "../lib/eventCapacity.mjs";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const RIGHTS = { supporters: "supporters:edit", people: "people:edit", registrations: "registrations:edit" };
const sameName = (a, b) => String(a || "").trim().replace(/\s+/g, " ").toLowerCase() === String(b || "").trim().replace(/\s+/g, " ").toLowerCase();

/** One sheet row → { value } ready to insert, or { error }. */
function checkRow(target, fields, event) {
  const tickets = event?.fee_required ? eventTiers(event) : [];
  const { input, error } = rowInput(target, fields, { tickets });
  if (error) return { error };
  if (target === "supporters") {
    const checked = validateSupporter(input);
    if (checked.error) return { error: checked.error };
    if (checked.value.status === "ended") checked.value.showOnSite = false;
    return { value: checked.value };
  }
  if (target === "people") return { value: input };
  const rsvp = validateRsvp(input);
  if (rsvp.error) return { error: rsvp.error };
  const ticket = chooseTicket(tickets, input.ticket, { anyTier: true });
  if (ticket.error) return { error: ticket.error };
  const attendees = cleanAttendeeCounts(input.humanCount, input.furbabyCount);
  if (attendees.error) return { error: attendees.error };
  const capacity = validateCapacityCounts(event.capacity_basis, attendees.humans, attendees.furbabies, { allowNoFurbaby: true });
  if (capacity.error) return { error: capacity.error };
  const due = calculateAmountDue({ basis: cleanPricingBasis(event.pricing_basis), tier: ticket.value, humans: attendees.humans, furbabies: attendees.furbabies, includedFurbabiesPerHuman: event.included_furbabies_per_human, additionalFurbabyFee: event.additional_furbaby_fee });
  if (due.error) return { error: due.error };
  const owes = owesPayment(event.fee_required, ticket.value);
  let feeStatus = "not_due";
  let proof = { method: null, reference: "", amount: null };
  if (owes && input.payment === "paid") {
    const checked = validateProof({ method: input.method, reference: input.reference, amount: input.amount || String(due.amount ?? ticket.value.amount ?? "") }, { admin: true });
    if (checked.error) return { error: `Marked Paid: ${checked.error.replace(/^Pick how you paid\.$/, "add how they paid (GCash, Maya, Bank transfer, Cash…)")}` };
    proof = checked.value;
    feeStatus = "paid";
  } else if (owes) feeStatus = "waiting";
  return { value: { ...rsvp.value, ticket: ticket.value, attendees, due: due.amount, feeStatus, proof } };
}

/** Is this row already here? Returns a reason to skip, or "". */
async function duplicateOf(target, value, eventId) {
  if (target === "supporters") {
    const [hit] = await sql("SELECT name FROM supporters WHERE lower(name) = lower($1) LIMIT 1", [value.name]);
    if (hit) return `already in Sponsors & partners as "${hit.name}"`;
    return "";
  }
  if (target === "people") {
    const [hit] = await sql("SELECT name FROM people WHERE kind = $1 AND lower(email) = lower($2) LIMIT 1", [value.kind, value.email]);
    return hit ? `already in People as ${value.kind} (${hit.name})` : "";
  }
  const hits = await sql("SELECT name FROM registrations WHERE event_id = $1 AND deleted_at IS NULL AND lower(email) = lower($2)", [eventId, value.email]);
  return hits.some((h) => sameName(h.name, value.name)) ? "already registered for this event (same name and email)" : "";
}

async function insertRow(target, value, event, admin) {
  if (target === "supporters") {
    const base = supporterSlug(value.name);
    const taken = await sql("SELECT slug FROM supporters WHERE slug = $1 OR slug LIKE $2", [base, `${base}-%`]);
    let slug = base;
    for (let n = 2; taken.some((r) => r.slug === slug); n += 1) slug = `${base}-${n}`;
    await sql(
      `INSERT INTO supporters (kind, name, slug, status, tier, website, instagram, blurb, gives, support_year, cash_amount, in_kind_value,
         in_kind_note, show_on_site, contact_name, contact_email, contact_phone, notes, category_label, code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,false,$14,$15,$16,$17,$18,$19) RETURNING id`,
      [value.kind, value.name, slug, value.status, value.tier, value.website, value.instagram, value.blurb, value.gives, value.supportYear,
        value.cashAmount, value.inKindValue, value.inKindNote, value.contactName, value.contactEmail, value.contactPhone, value.notes, value.categoryLabel, value.code],
    ).then(async ([row]) => {
      // Confirmed ones get their HOR number now, as when saved in the form (same lock and rule as saveSupporter).
      if (value.status !== "confirmed") return;
      await transaction(async (tx) => {
        await tx.sql("SELECT pg_advisory_xact_lock(727011)");
        await tx.sql(
          `WITH me AS (SELECT extract(year FROM s.created_at AT TIME ZONE 'Asia/Manila')::smallint AS y FROM supporters s WHERE s.id = $1)
           UPDATE supporters SET number_year = (SELECT y FROM me),
             number_no = (SELECT coalesce(max(number_no), 0) + 1 FROM supporters WHERE number_year = (SELECT y FROM me))
           WHERE id = $1 AND number_no IS NULL`,
          [row.id],
        );
      });
    });
    return;
  }
  if (target === "people") {
    await sql(
      `INSERT INTO people (kind, name, email, social_profile, organization, furbaby_name, message, status, notes, membership)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CASE WHEN $1 IN ('Member', 'Volunteer') THEN 'applicant' END)`,
      [value.kind, value.name, value.email, value.socialProfile, value.organization, value.furbabyName, value.message, value.status, value.notes],
    );
    return;
  }
  await transaction(async (tx) => {
    await tx.sql("SELECT id FROM events WHERE id=$1 FOR UPDATE", [event.id]);
    await tx.sql(
      `INSERT INTO registrations (event_id, name, email, furbaby_name, photo_consent, under_18, guardian_name, status, fee_status, check_in_code,
         ticket_label, ticket_amount, human_count, furbaby_count, amount_due, pay_method, fee_reference, pay_amount, fee_checked_by, fee_checked_at, added_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed',$8,$9,$10,$11,$12,$13,$14,$15,NULLIF($16,''),$17,$18,$19,$20)`,
      [event.id, value.name, value.email, value.furbabyName, value.photoConsent, value.under18, value.guardianName, value.feeStatus, newCheckInCode(),
        value.ticket.label, value.ticket.amount, value.attendees.humans, value.attendees.furbabies, value.due, value.proof.method, value.proof.reference, value.proof.amount,
        value.feeStatus === "paid" ? admin.email : null, value.feeStatus === "paid" ? new Date().toISOString() : null, admin.email],
    );
  });
}

/**
 * Checks (commit=false) or imports (commit=true) mapped sheet rows. Each row
 * comes back as add / skip (already here) / error; on import only "add" rows
 * are written. No emails are sent (owner's decision).
 * @param {{ target: string, eventId?: string, rows: { line: number, fields: Record<string,string> }[], commit?: boolean }} request
 */
export async function importSheet({ target, eventId, rows, commit = false }) {
  if (!IMPORT_TARGETS[target]) return { error: "Unknown import." };
  let admin;
  try { admin = await actionAdmin(RIGHTS[target]); } catch { return { error: "You don't have access to import these." }; }
  if (!Array.isArray(rows) || !rows.length) return { error: "The sheet has no rows to import." };
  if (rows.length > MAX_IMPORT_ROWS) return { error: `That's ${rows.length} rows; import up to ${MAX_IMPORT_ROWS} at a time.` };
  let event = null;
  if (target === "registrations") {
    [event] = isUuid(eventId) ? await sql("SELECT id, title, fee_required, capacity, capacity_basis, pricing_basis, included_furbabies_per_human, additional_furbaby_fee, price_tiers, cost FROM events WHERE id = $1", [eventId]) : [];
    if (!event) return { error: "That event no longer exists." };
  }

  const results = [];
  const seen = new Set();
  const codes = new Set();
  for (const row of rows) {
    const fields = Object.fromEntries(Object.entries(row?.fields || {}).map(([k, v]) => [k, String(v ?? "").slice(0, 2000)]));
    const line = Number(row?.line) || 0;
    const checked = checkRow(target, fields, event);
    if (checked.error) { results.push({ line, status: "error", reason: checked.error, name: fields.name || "" }); continue; }
    const v = checked.value;
    const key = target === "supporters" ? v.name.toLowerCase() : target === "people" ? `${v.kind}|${v.email}` : `${v.email}|${v.name.toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(key)) { results.push({ line, status: "skip", reason: "same as an earlier row in this sheet", name: v.name }); continue; }
    seen.add(key);
    if (target === "supporters" && v.code) {
      const [taken] = await sql("SELECT name FROM supporters WHERE code = $1", [v.code]);
      if (taken || codes.has(v.code)) { results.push({ line, status: "error", reason: `ID code ${v.code} is already ${taken ? `${taken.name}'s` : "used by an earlier row"}; pick another 4 letters`, name: v.name }); continue; }
      codes.add(v.code);
    }
    const dup = await duplicateOf(target, v, event?.id);
    if (dup) { results.push({ line, status: "skip", reason: dup, name: v.name }); continue; }
    if (commit) {
      try { await insertRow(target, v, event, admin); } catch (err) {
        results.push({ line, status: "error", reason: err?.code === "23505" ? "already here (added at the same time)" : "couldn't be saved", name: v.name });
        continue;
      }
    }
    results.push({ line, status: "add", name: v.name });
  }

  const added = results.filter((r) => r.status === "add").length;
  if (commit && added) {
    await logActivity(admin.email, `${target === "supporters" ? "supporter" : target === "people" ? "people" : "registration"}.import`, event?.title || IMPORT_TARGETS[target].title, {
      added, skipped: results.filter((r) => r.status === "skip").length, errors: results.filter((r) => r.status === "error").length, ...(event ? { eventId: event.id } : {}),
    });
    revalidatePath("/", "layout");
  }
  return { results, committed: commit };
}
