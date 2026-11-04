"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { pictureFrom } from "../lib/admin/imageUpload";
import { saveSocials, socialsFrom } from "../lib/socialsStore";
import { cleanPhotographer } from "../lib/photographers.mjs";

const form = (data, key) => (typeof data.get(key) === "string" ? data.get(key) : "");
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** Photographers: add or update one. */
export async function savePhotographer(data) {
  const id = form(data, "id");
  const back = isUuid(id) ? `/photographers/${id}` : "/photographers/new";
  return guarded(back, async () => {
    const admin = await actionAdmin("photographers:edit");
    const { photographer: p, error } = cleanPhotographer(Object.fromEntries(["name", "bio", "website", "instagram", "notes", "showOnSite"].map((k) => [k, form(data, k)])));
    if (error) await backWith(back, "error", error);
    const socials = socialsFrom(data);
    if (socials.error) await backWith(back, "error", socials.error);
    const photo = await pictureFrom(data, "photo", admin.email);
    if (photo.error) await backWith(back, "error", photo.error);
    const [taken] = await sql("SELECT id FROM photographers WHERE deleted_at IS NULL AND lower(name) = lower($1) AND id IS DISTINCT FROM $2", [p.name, isUuid(id) ? id : null]);
    if (taken) await backWith(back, "error", `${p.name} is already in Photographers.`);
    const values = [p.name, photo.url, p.bio, p.website, p.instagram, p.showOnSite, p.notes];
    if (isUuid(id)) {
      const [row] = await sql("UPDATE photographers SET name=$1, photo=$2, bio=$3, website=$4, instagram=$5, show_on_site=$6, notes=$7, updated_at=now() WHERE id=$8 AND deleted_at IS NULL RETURNING id", [...values, id]);
      if (!row) await backWith("/photographers", "error", "That photographer no longer exists.");
      await saveSocials("photographers", id, socials.values);
      await logActivity(admin.email, "photographer.update", p.name, { photographerId: id });
      await backWith(back, "ok", `Saved ${p.name}.`);
    }
    const [row] = await sql("INSERT INTO photographers (name, photo, bio, website, instagram, show_on_site, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id", [...values, admin.email]);
    await saveSocials("photographers", row.id, socials.values);
    await logActivity(admin.email, "photographer.add", p.name, { photographerId: row.id });
    await backWith(`/photographers/${row.id}`, "ok", `Added ${p.name}. Credit them on an event from that event's page.`);
  });
}

/** Photographers: remove one (kept in the database, taken off events and the list). */
export async function removePhotographer(data) {
  const id = form(data, "id");
  return guarded("/photographers", async () => {
    const admin = await actionAdmin("photographers:edit");
    if (!isUuid(id)) await backWith("/photographers", "error", "That photographer wasn't found.");
    const [row] = await sql("UPDATE photographers SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING name", [id]);
    await sql("DELETE FROM event_photographers WHERE photographer_id = $1", [id]);
    if (row) await logActivity(admin.email, "photographer.remove", row.name, { photographerId: id });
    await backWith("/photographers", "ok", row ? `Removed ${row.name}.` : "Already removed.");
  });
}

/** An event's "Photos by": the ticked photographers, in the order ticked boxes appear. */
export async function setEventPhotographers(data) {
  const eventId = form(data, "event");
  const back = isUuid(eventId) ? `/events/${eventId}` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("events:edit");
    const [event] = isUuid(eventId) ? await sql("SELECT id, title FROM events WHERE id = $1", [eventId]) : [];
    if (!event) await backWith("/events", "error", "That event wasn't found.");
    const ids = [...new Set(data.getAll("photographer").filter(isUuid))];
    const known = ids.length ? await sql("SELECT id FROM photographers WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL", [ids]) : [];
    const keep = ids.filter((id) => known.some((k) => k.id === id));
    await sql("DELETE FROM event_photographers WHERE event_id = $1", [event.id]);
    for (const [position, id] of keep.entries()) await sql("INSERT INTO event_photographers (event_id, photographer_id, position) VALUES ($1, $2, $3)", [event.id, id, position]);
    await logActivity(admin.email, "event.photographers", event.title, { eventId: event.id, photographers: keep });
    await backWith(back, "ok", keep.length ? `Photos by: ${keep.length} photographer${keep.length === 1 ? "" : "s"} credited.` : "No photographers credited.");
  });
}
