"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { cleanEventBrand, readRole, replyLabel, roleLabel } from "../lib/eventBrands.mjs";
import { inviteBrands, removeFromTracker, saveTrackerRow } from "../lib/eventBrandsStore";
import { issueSupporterNumber } from "../lib/supporterNumbers";
import { addedLine, applyEventPicks } from "../lib/brandEventPicks";
import { readTrackerChanges, savedMessage } from "../lib/trackerChanges.mjs";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

async function eventOf(data) {
  const id = form(data, "event");
  if (!isUuid(id)) return null;
  const [event] = await sql("SELECT id, title FROM events WHERE id = $1", [id]);
  return event || null;
}

/** Brand tracker: invite ticked directory brands to this event. Nothing is emailed. */
export async function inviteToEvent(data) {
  const event = await eventOf(data);
  const back = event ? `/events/${event.id}/brands` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("supporters:edit");
    if (!event) await backWith("/events", "error", "That event wasn't found.");
    const ids = [...new Set(data.getAll("brand").filter(isUuid))];
    if (!ids.length) await backWith(back, "error", "Tick at least one brand to invite.");
    const { added, already } = await inviteBrands(event.id, ids, admin.email);
    if (added) await logActivity(admin.email, "event.brand.invite", event.title, { eventId: event.id, added });
    await backWith(back, "ok", `Added ${added} brand${added === 1 ? "" : "s"} to the tracker.${already ? ` ${already} ${already === 1 ? "was" : "were"} already on it.` : ""} Nothing was emailed.`);
  });
}

/** Brand tracker: save one brand's role, reply and giving for this event. */
export async function saveTrackerEntry(data) {
  const event = await eventOf(data);
  const back = event ? `/events/${event.id}/brands` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("supporters:edit");
    if (!event) await backWith("/events", "error", "That event wasn't found.");
    const supporterId = form(data, "brand");
    if (!isUuid(supporterId)) await backWith(back, "error", "That brand wasn't found.");
    const fields = ["role", "reply", "followUpOn", "cashAmount", "inKindValue", "inKindNote", "boothNeeds", "repsAttending", "dogsAttending", "showAmounts", "notes"];
    const { value, error } = cleanEventBrand({ ...Object.fromEntries(fields.map((k) => [k, form(data, k)])), gives: data.getAll("gives") });
    if (error) await backWith(back, "error", error);
    const [brand] = await sql("SELECT name, code, number_no FROM supporters WHERE id = $1", [supporterId]);
    // A Yes gives the brand its HOR number, which needs its 4-letter code.
    if (value.reply === "yes" && brand && !brand.number_no && !brand.code) {
      await backWith(back, "error", `Give ${brand.name} a 4-letter ID code first (on its brand page), then mark Yes.`);
    }
    const before = await saveTrackerRow(event.id, supporterId, value);
    if (!before) await backWith(back, "error", "That brand isn't on this event's tracker.");
    // The greeting belongs to the brand, so it's the same at every event.
    if (data.has("greeting")) {
      const greeting = ["contact", "team", "custom"].includes(form(data, "greeting")) ? form(data, "greeting") : "auto";
      await sql("UPDATE supporters SET greeting=$2, salutation=$3 WHERE id=$1", [supporterId, greeting, form(data, "salutation").replace(/\s+/g, " ").trim().slice(0, 120) || null]);
    }
    const numbered = value.reply === "yes" && brand && !brand.number_no ? await issueSupporterNumber(supporterId) : "";
    await logActivity(admin.email, "event.brand.save", brand?.name || "", { eventId: event.id, supporterId, reply: value.reply, ...(numbered ? { number: numbered } : {}) });
    await backWith(back, "ok", `Saved ${brand?.name}: ${replyLabel(value.reply)}.${numbered ? ` Their number is ${numbered}.` : ""}`);
  });
}

/** Brand tracker: take a brand off this event's tracker (the directory keeps it). */
export async function removeTrackerEntry(data) {
  const event = await eventOf(data);
  const back = event ? `/events/${event.id}/brands` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("supporters:edit");
    if (!event) await backWith("/events", "error", "That event wasn't found.");
    const supporterId = form(data, "brand");
    const [brand] = isUuid(supporterId) ? await sql("SELECT name FROM supporters WHERE id = $1", [supporterId]) : [];
    const removed = isUuid(supporterId) ? await removeFromTracker(event.id, supporterId) : [];
    if (removed.length) await logActivity(admin.email, "event.brand.remove", brand?.name || "", { eventId: event.id, supporterId });
    await backWith(back, "ok", removed.length ? `Took ${brand?.name} off this event's tracker.` : "Already off the tracker.");
  });
}

/** A brand's page: put it on the ticked events' Brand trackers, upcoming or past. Nothing is emailed. */
export async function addBrandToEventsAction(data) {
  const supporterId = form(data, "brand");
  const back = isUuid(supporterId) ? `/supporters/${supporterId}` : "/supporters";
  return guarded(back, async () => {
    const admin = await actionAdmin("supporters:edit");
    if (!isUuid(supporterId)) await backWith("/supporters", "error", "That brand wasn't found.");
    if (!data.getAll("addEvents").length) await backWith(back, "error", "Tick at least one event.");
    const picks = await applyEventPicks(supporterId, data, admin.email);
    if (!picks.added.length) await backWith(back, "error", "It's already on those events.");
    const message = [addedLine(picks), picks.number ? `Their number is ${picks.number}.` : "", picks.note].filter(Boolean).join(" ");
    await backWith(back, picks.note ? "error" : "ok", message);
  });
}

/**
 * The Brand tracker's one Save (owner, 23 Nov 2026): every reply and Type picked on the rows, saved together.
 * Each change runs the same rules as before: a first Yes needs the brand's 4-letter code and issues its HOR
 * number; a Type sets role, partner type and sponsor level together. Giving and notes stay; nothing is emailed.
 */
export async function saveTrackerChanges(data) {
  const event = await eventOf(data);
  const back = event ? `/events/${event.id}/brands` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("supporters:edit");
    if (!event) await backWith("/events", "error", "That event wasn't found.");
    const changes = readTrackerChanges(form(data, "changes"), {
      reply: (v) => ["waiting", "yes", "no"].includes(v),
      role: (v) => Boolean(readRole(v).role),
    });
    if (!changes.length) await backWith(back, "error", "There were no changes to save.");
    const done = [];
    const problems = [];
    // Types first, so a brand changed to Sponsor and marked Yes in the same save is logged in that order.
    for (const c of [...changes].sort((a, b) => (a.field === "role" ? 0 : 1) - (b.field === "role" ? 0 : 1))) {
      const [brand] = await sql("SELECT name, code, number_no FROM supporters WHERE id = $1", [c.row]);
      if (!brand) { problems.push("A brand wasn't found."); continue; }
      if (c.field === "role") {
        const { role, partnerType, sponsorLevel } = readRole(c.to);
        const [row] = await sql(
          `UPDATE event_brands SET role = $3, partner_type = $4, sponsor_level = $5, updated_at = now()
            WHERE event_id = $1 AND supporter_id = $2 RETURNING role, partner_type, sponsor_level`,
          [event.id, c.row, role, partnerType, sponsorLevel],
        );
        if (!row) { problems.push(`${brand.name} isn't on this event's tracker.`); continue; }
        const label = roleLabel(row);
        await logActivity(admin.email, "event.brand.role", brand.name, { eventId: event.id, supporterId: c.row, role, type: label });
        done.push(`${brand.name} is ${/^[AEIOU]/.test(label) ? "an" : "a"} ${label.toLowerCase()}.`);
      } else {
        if (c.to === "yes" && !brand.number_no && !brand.code) {
          problems.push(`Give ${brand.name} a 4-letter ID code first (on its brand page), then mark Yes.`);
          continue;
        }
        const [row] = await sql(
          `UPDATE event_brands SET reply = $3, replied_at = CASE WHEN $3 <> reply AND $3 <> 'waiting' THEN now() ELSE replied_at END, updated_at = now()
            WHERE event_id = $1 AND supporter_id = $2 RETURNING reply`,
          [event.id, c.row, c.to],
        );
        if (!row) { problems.push(`${brand.name} isn't on this event's tracker.`); continue; }
        const numbered = c.to === "yes" && !brand.number_no ? await issueSupporterNumber(c.row) : "";
        await logActivity(admin.email, "event.brand.reply", brand.name, { eventId: event.id, supporterId: c.row, reply: c.to, ...(numbered ? { number: numbered } : {}) });
        done.push(`${brand.name}: ${replyLabel(c.to)}.${numbered ? ` Their number is ${numbered}.` : ""}`);
      }
    }
    await backWith(back, done.length ? "ok" : "error", savedMessage(done, problems));
  });
}
