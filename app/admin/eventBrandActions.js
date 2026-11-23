"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { cleanEventBrand, readRole, replyLabel, roleLabel } from "../lib/eventBrands.mjs";
import { inviteBrands, removeFromTracker, saveTrackerRow } from "../lib/eventBrandsStore";
import { issueSupporterNumber } from "../lib/supporterNumbers";
import { addedLine, applyEventPicks } from "../lib/brandEventPicks";

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
 * Brand tracker: the row's reply control (design review, 18 Nov 2026). Saves only the reply, like the Guest
 * tracker's; a brand's first Yes still needs its 4-letter code and issues its HOR number, as the Edit window does.
 */
export async function setTrackerReply(data) {
  const event = await eventOf(data);
  const back = event ? `/events/${event.id}/brands` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("supporters:edit");
    if (!event) await backWith("/events", "error", "That event wasn't found.");
    const supporterId = form(data, "brand");
    const reply = ["waiting", "yes", "no"].includes(form(data, "reply")) ? form(data, "reply") : "waiting";
    const [brand] = isUuid(supporterId) ? await sql("SELECT name, code, number_no FROM supporters WHERE id = $1", [supporterId]) : [];
    if (!brand) await backWith(back, "error", "That brand wasn't found.");
    if (reply === "yes" && !brand.number_no && !brand.code) {
      await backWith(back, "error", `Give ${brand.name} a 4-letter ID code first (on its brand page), then mark Yes.`);
    }
    const [row] = await sql(
      `UPDATE event_brands SET reply = $3, replied_at = CASE WHEN $3 <> reply AND $3 <> 'waiting' THEN now() ELSE replied_at END, updated_at = now()
        WHERE event_id = $1 AND supporter_id = $2 RETURNING reply`,
      [event.id, supporterId, reply],
    );
    if (!row) await backWith(back, "error", "That brand isn't on this event's tracker.");
    const numbered = reply === "yes" && !brand.number_no ? await issueSupporterNumber(supporterId) : "";
    await logActivity(admin.email, "event.brand.reply", brand.name, { eventId: event.id, supporterId, reply, ...(numbered ? { number: numbered } : {}) });
    await backWith(back, "ok", `${brand.name}: ${replyLabel(reply)}.${reply === "yes" ? " They show on this event's page." : ""}${numbered ? ` Their number is ${numbered}.` : ""}`);
  });
}

/**
 * The Brand tracker's Type column (owner, 23 Nov 2026; was a Partner / Sponsor switch, 18 Nov): sets the brand's
 * role and its type at this event in one choice ("Partner:exhibitor", "Sponsor:major"; a bare "Partner" or
 * "Sponsor" clears the type). Reply, giving and notes stay as they are; nothing is emailed.
 */
export async function setTrackerRole(data) {
  const event = await eventOf(data);
  const back = event ? `/events/${event.id}/brands` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("supporters:edit");
    if (!event) await backWith("/events", "error", "That event wasn't found.");
    const supporterId = form(data, "brand");
    const { role, partnerType, sponsorLevel } = readRole(form(data, "role"));
    if (!role) await backWith(back, "error", "Pick a type for this brand.");
    const [brand] = isUuid(supporterId) ? await sql("SELECT name FROM supporters WHERE id = $1", [supporterId]) : [];
    if (!brand) await backWith(back, "error", "That brand wasn't found.");
    const [row] = await sql(
      `UPDATE event_brands SET role = $3, partner_type = $4, sponsor_level = $5, updated_at = now()
        WHERE event_id = $1 AND supporter_id = $2 RETURNING role, partner_type, sponsor_level`,
      [event.id, supporterId, role, partnerType, sponsorLevel],
    );
    if (!row) await backWith(back, "error", "That brand isn't on this event's tracker.");
    const label = roleLabel(row);
    await logActivity(admin.email, "event.brand.role", brand.name, { eventId: event.id, supporterId, role, type: label });
    await backWith(back, "ok", `${brand.name} is now listed as ${/^[AEIOU]/.test(label) ? "an" : "a"} ${label.toLowerCase()} at this event.`);
  });
}
