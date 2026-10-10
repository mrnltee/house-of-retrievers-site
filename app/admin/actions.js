"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql, transaction } from "../lib/db";
import { actionAdmin, adminHref, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { alertAdmins } from "../lib/admin/notify";
import { canApprovePaymentChange, cleanRoles, parseEmailList, signedInRecently } from "../lib/admin/roles.mjs";
import { METHODS, diffChange, needsApproval, validateChange } from "../lib/admin/payments.mjs";
import { cleanSlug, slugify, validateEvent } from "../lib/admin/events.mjs";
import { destroyPhoto } from "../lib/cloudinary.mjs";
import { checkInOutcome, normalizeCode } from "../lib/admin/registrations.mjs";
import { MEMBERSHIP_KEYS, PEOPLE_STATUSES, memberNumber, membershipLabel } from "../lib/admin/people.mjs";
import { readSheet } from "../lib/admin/peopleImport.mjs";
import { sendEmail } from "../lib/email";
import { welcomeMember } from "../lib/emailTemplates.mjs";


/** Resized in the browser to ~200–400 KB; this is only a ceiling against tampering. */
const MAX_EVENT_PHOTO_BYTES = 2 * 1024 * 1024;

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

/** Runs an action, turning a role refusal into a message instead of an error page. */
async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

// ---------- Events ----------

/** Stores a browser-made photo (a data URL) and returns its id. */
async function storeEventImage(dataUrl, email, back) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) await backWith(back, "error", "That photo didn't come through. Try another one.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_EVENT_PHOTO_BYTES) await backWith(back, "error", "That photo is too large even after resizing. Try another one.");
  const [saved] = await sql(
    "INSERT INTO event_images (mime, data, bytes, created_by) VALUES ($1, $2, $3, $4) RETURNING id",
    [match[1], bytes, bytes.length, email],
  );
  return saved.id;
}

/** The framing sent by the editor, checked and rounded, or null. */
function parseCrop(raw) {
  try {
    const { zoom, x, y } = JSON.parse(raw || "null") || {};
    const ok = [zoom, x, y].every(Number.isFinite) && zoom >= 1 && zoom <= 4 && x >= 0 && x <= 1 && y >= 0 && y <= 1;
    return ok ? { zoom: +zoom.toFixed(4), x: +x.toFixed(4), y: +y.toFixed(4) } : null;
  } catch {
    return null;
  }
}

export async function saveEvent(data) {
  const id = form(data, "id");
  const intent = form(data, "intent");
  const back = isUuid(id) ? `/events/${id}` : "/events/new";
  return guarded(back, async () => {
    const admin = await actionAdmin("events:edit");
    const input = Object.fromEntries([...data.entries()].filter(([, v]) => typeof v === "string"));
    input.rsvpOpen = data.get("rsvpOpen") === "on";
    input.feeRequired = data.get("feeRequired") === "on";
    input.photoUploads = data.getAll("photoUploads").filter((v) => typeof v === "string");
    delete input.imageData;
    delete input.imageSourceData;
    delete input.imageCrop;
    delete input.imageSource;

    // Cover photo: a new crop, a removal, or (by default) whatever the event already has.
    // Alongside a new crop may come the uncropped original and the framing used.
    let photo = null; // { source, crop } to store when there is a new crop
    const upload = form(data, "imageData");
    if (upload) {
      const saved = await storeEventImage(upload, admin.email, back);
      input.image = `/api/event-image/${saved}`;
      let source = null;
      const original = form(data, "imageSourceData");
      if (original) {
        source = `/api/event-image/${await storeEventImage(original, admin.email, back)}`;
      } else if (isUuid(id)) {
        // Re-framed from a photo the event already had: its original, or (for
        // photos saved before originals were kept) its previous cover.
        const reused = form(data, "imageSource");
        const [current] = await sql("SELECT image, image_source FROM events WHERE id=$1", [id]);
        if (current && reused && (reused === current.image_source || reused === current.image)) source = reused;
      }
      photo = { source, crop: source ? parseCrop(form(data, "imageCrop")) : null };
    } else if (form(data, "imageRemove")) {
      input.image = "";
      photo = { source: null, crop: null };
    } else if (isUuid(id)) {
      const [current] = await sql("SELECT image FROM events WHERE id=$1", [id]);
      input.image = current?.image || "";
    } else {
      input.image = "";
    }
    if (!input.image) input.imageAlt = "";

    // Validate as a draft first, so a failed Publish still saves what was typed.
    const { value, error, missing } = validateEvent(input);
    if (error) await backWith(back, "error", error);
    const blockedPublish = intent === "publish" && missing.length > 0;

    let status = null;
    if (intent === "publish" && !blockedPublish) status = "published";
    if (intent === "unpublish") status = "draft";
    if (intent === "cancel") status = "cancelled";

    const fields = [value.title, value.category || "", value.date, value.startTime, value.endTime, value.venue, value.city, value.cost, value.supports, value.summary, value.image, value.imageAlt, value.registration, value.capacity, value.rsvpOpen, value.feeRequired];
    let eventId = id;
    let unpublished = false;
    if (isUuid(id) && !status && missing.length) {
      // A published event can't lose a required fact and stay public.
      const [current] = await sql("SELECT status FROM events WHERE id=$1", [id]);
      if (current?.status === "published") {
        status = "draft";
        unpublished = true;
      }
    }
    // A new web address: check it first, so a clash saves nothing.
    let newSlug = null;
    let oldSlug = null;
    if (isUuid(id) && data.has("slug")) {
      const [current] = await sql("SELECT slug FROM events WHERE id=$1", [id]);
      const wanted = cleanSlug(form(data, "slug"));
      if (wanted.error) await backWith(back, "error", wanted.error);
      if (current && wanted.slug !== current.slug) {
        const [clash] = await sql("SELECT 1 FROM events WHERE slug=$1 AND id<>$2", [wanted.slug, id]);
        if (clash) await backWith(back, "error", `Another event already uses "${wanted.slug}". Pick a different web address.`);
        newSlug = wanted.slug;
        oldSlug = current.slug;
      }
    }

    if (isUuid(id)) {
      const rows = await sql(
        `UPDATE events SET title=$1, category=$2, date=$3, start_time=$4, end_time=$5, venue=$6, city=$7, cost=$8, supports=$9, summary=$10,
           image=$11, image_alt=$12, registration=$13, capacity=$14, rsvp_open=$15, fee_required=$16,
           status=COALESCE($17, status), updated_at=now()
         WHERE id=$18 RETURNING id`,
        [...fields, status, id],
      );
      if (!rows.length) await backWith("/events", "error", "That event no longer exists.");
    } else {
      let slug = slugify(value.title, value.date);
      const taken = await sql("SELECT slug FROM events WHERE slug = $1 OR slug LIKE $2", [slug, `${slug}-%`]);
      if (taken.length) slug = `${slug}-${taken.length + 1}`;
      const rows = await sql(
        `INSERT INTO events (title, category, date, start_time, end_time, venue, city, cost, supports, summary, image, image_alt,
           registration, capacity, rsvp_open, fee_required, status, slug)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17,'draft'),$18) RETURNING id`,
        [...fields, status, slug],
      );
      eventId = rows[0].id;
    }
    if (newSlug) {
      // The old address keeps working: it forwards to the new one.
      await transaction(async (tx) => {
        await tx.sql(
          `INSERT INTO event_slug_redirects (old_slug, event_id) VALUES ($1, $2)
             ON CONFLICT (old_slug) DO UPDATE SET event_id = EXCLUDED.event_id`,
          [oldSlug, eventId],
        );
        await tx.sql("DELETE FROM event_slug_redirects WHERE old_slug=$1", [newSlug]);
        await tx.sql("UPDATE events SET slug=$1 WHERE id=$2", [newSlug, eventId]);
      });
      await logActivity(admin.email, "event.address", value.title, { eventId, from: oldSlug, to: newSlug });
    }
    await sql(
      "UPDATE events SET is_charity=$1, purpose=$2, hashtags=$3, venue_lat=$4, venue_lng=$5, map_url=$6 WHERE id=$7",
      [value.isCharity, value.purpose, value.hashtags, value.venueLat, value.venueLng, value.mapUrl, eventId],
    );
    // Sent only by editors that have these fields, so an older open tab can't blank them.
    if (data.has("priceTiers")) await sql("UPDATE events SET price_tiers=$1 WHERE id=$2", [JSON.stringify(value.priceTiers), eventId]);
    if (data.has("venueAddress")) await sql("UPDATE events SET venue_address=$1 WHERE id=$2", [value.venueAddress, eventId]);
    if (data.has("included")) await sql("UPDATE events SET included=$1 WHERE id=$2", [value.included, eventId]);
    if (data.has("imageFit")) await sql("UPDATE events SET image_fit=$1 WHERE id=$2", [value.imageFit, eventId]);
    if (data.has("gallery")) await sql("UPDATE events SET gallery=$1 WHERE id=$2", [JSON.stringify(value.gallery), eventId]);
    if (data.has("photoUploadsSent")) await sql("UPDATE events SET photo_uploads=$1 WHERE id=$2", [value.photoUploads, eventId]);
    if (photo) {
      await sql("UPDATE events SET image_source=$1, image_crop=$2 WHERE id=$3", [photo.source, photo.crop && JSON.stringify(photo.crop), eventId]);
    }
    await logActivity(admin.email, status ? `event.${intent}` : "event.save", value.title, { eventId });
    revalidatePath("/events", "layout");
    if (unpublished) await backWith(`/events/${eventId}`, "error", `Saved and moved back to draft, because it's missing: ${missing.join(", ")}.`);
    if (blockedPublish) await backWith(`/events/${eventId}`, "error", `Saved as a draft. Fill these before publishing: ${missing.join(", ")}.`);
    await backWith(`/events/${eventId}`, "ok", status === "published" ? "Published. It's on the events page now." : "Saved.");
  });
}

// ---------- Registrations ----------

async function registrationWithEvent(regId) {
  if (!isUuid(regId)) return null;
  const rows = await sql(
    `SELECT r.*, e.capacity, e.title FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = $1`,
    [regId],
  );
  return rows[0] || null;
}

export async function setFeeStatus(data) {
  const regId = form(data, "id");
  const reg = await registrationWithEvent(regId);
  const back = reg ? `/registrations/${reg.event_id}` : "/registrations";
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:fees");
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    const status = ["not_due", "waiting", "paid"].includes(form(data, "fee")) ? form(data, "fee") : "waiting";
    const ref = form(data, "reference").trim().slice(0, 80) || null;
    await sql("UPDATE registrations SET fee_status=$1, fee_reference=COALESCE($2, fee_reference) WHERE id=$3", [status, ref, regId]);
    await logActivity(admin.email, "registration.fee", reg.title, { registrationId: regId, status });
    await backWith(back, "ok", "Fee updated.");
  });
}

export async function changeRegistration(data) {
  const regId = form(data, "id");
  const op = form(data, "op");
  const reg = await registrationWithEvent(regId);
  const back = reg ? `/registrations/${reg.event_id}` : "/registrations";
  return guarded(back, async () => {
    const admin = await actionAdmin("registrations:edit");
    if (!reg) await backWith("/registrations", "error", "That registration no longer exists.");
    if (op === "cancel") {
      await sql("UPDATE registrations SET status='cancelled' WHERE id=$1", [regId]);
      await logActivity(admin.email, "registration.cancel", reg.title, { registrationId: regId });
      revalidatePath("/events", "layout");
      await backWith(back, "ok", "Cancelled. Offer the slot to the first person on the waitlist if there is one.");
    }
    if (op === "confirm") {
      // Re-count inside a transaction so two admins can't both fill the last slot.
      const moved = await transaction(async (tx) => {
        await tx.sql("SELECT id FROM events WHERE id=$1 FOR UPDATE", [reg.event_id]);
        const [{ count }] = await tx.sql("SELECT count(*)::int AS count FROM registrations WHERE event_id=$1 AND status='confirmed'", [reg.event_id]);
        if (reg.capacity != null && count >= reg.capacity) return false;
        await tx.sql(
          `UPDATE registrations SET status='confirmed',
             fee_status = CASE WHEN (SELECT fee_required FROM events WHERE id=$2) AND fee_status='not_due' THEN 'waiting' ELSE fee_status END
           WHERE id=$1 AND status='waitlist'`,
          [regId, reg.event_id],
        );
        return true;
      });
      if (!moved) await backWith(back, "error", "The event is full. Cancel someone or raise the capacity first.");
      await logActivity(admin.email, "registration.confirm", reg.title, { registrationId: regId });
      revalidatePath("/events", "layout");
      await backWith(back, "ok", "Moved from the waitlist to confirmed. Let them know.");
    }
    await backWith(back, "error", "Unknown action.");
  });
}

/** Called from the check-in screen. Returns a result instead of redirecting. */
export async function checkInByCode(eventId, rawCode) {
  try {
    const admin = await actionAdmin("checkin");
    const code = normalizeCode(rawCode);
    if (!isUuid(eventId) || !code) return { outcome: "unknown" };
    const rows = await sql(
      `SELECT r.id, r.event_id, r.name, r.furbaby_name, r.status, r.checked_in_at, r.photo_consent, r.under_18, r.guardian_name, r.fee_status, e.fee_required
       FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.check_in_code = $1`,
      [code],
    );
    const reg = rows[0];
    const outcome = checkInOutcome(reg, eventId);
    const person = reg && reg.event_id === eventId
      ? { name: reg.name, furbaby: reg.furbaby_name, photoConsent: reg.photo_consent, under18: reg.under_18, guardian: reg.guardian_name, feeStatus: reg.fee_required ? reg.fee_status : null }
      : null;
    if (outcome === "ok") {
      await sql("UPDATE registrations SET checked_in_at = now() WHERE id = $1 AND checked_in_at IS NULL", [reg.id]);
      await logActivity(admin.email, "registration.checkin", null, { registrationId: reg.id });
    }
    return { outcome, person };
  } catch (error) {
    if (error instanceof Forbidden) return { outcome: "forbidden", message: error.message };
    throw error;
  }
}

// ---------- People ----------

export async function updatePerson(data) {
  const id = form(data, "id");
  const kind = form(data, "kind");
  const back = form(data, "back") === "profile" && isUuid(id) ? `/people/${id}` : `/people?kind=${encodeURIComponent(kind || "Member")}`;
  return guarded(back, async () => {
    const admin = await actionAdmin("people:edit");
    if (!isUuid(id) || !PEOPLE_STATUSES[kind]) await backWith(back, "error", "That person no longer exists.");
    const status = form(data, "status");
    if (!PEOPLE_STATUSES[kind].includes(status)) await backWith(back, "error", "Pick a status from the list.");
    const notes = form(data, "notes").trim().slice(0, 2000) || null;
    const rows = await sql("UPDATE people SET status=$1, notes=$2, updated_at=now() WHERE id=$3 AND kind=$4 RETURNING name", [status, notes, id, kind]);
    if (!rows.length) await backWith(back, "error", "That person no longer exists.");
    await logActivity(admin.email, "person.update", kind, { personId: id, status });
    await backWith(back, "ok", `Saved ${rows[0].name}.`);
  });
}

/**
 * Membership for a Member: applicant → active → inactive / left. The first
 * time someone becomes active they get a member number and "member since",
 * and (if email is set up and the box is ticked) the welcome email.
 */
export async function updateMembership(data) {
  const id = form(data, "id");
  const back = isUuid(id) ? `/people/${id}` : "/people";
  return guarded(back, async () => {
    const admin = await actionAdmin("people:edit");
    const membership = form(data, "membership");
    if (!isUuid(id) || !MEMBERSHIP_KEYS.includes(membership)) await backWith(back, "error", "Pick a membership status from the list.");
    const [before] = await sql("SELECT name, email, kind, membership, member_no FROM people WHERE id=$1", [id]);
    if (!before || before.kind !== "Member") await backWith(back, "error", "Membership applies to Members only.");
    // First activation takes the next number in this year (HOR-YY-NNNN). The
    // lock makes two admins activating at once get different numbers.
    const after = await transaction(async (tx) => {
      await tx.sql("SELECT pg_advisory_xact_lock(727010)");
      const [row] = await tx.sql(
        `WITH yr AS (SELECT extract(year FROM now() AT TIME ZONE 'Asia/Manila')::smallint AS y)
         UPDATE people SET membership=$1,
           member_year = CASE WHEN $1 = 'active' AND member_no IS NULL THEN (SELECT y FROM yr) ELSE member_year END,
           member_no = CASE WHEN $1 = 'active' AND member_no IS NULL
             THEN (SELECT coalesce(max(member_no), 0) + 1 FROM people WHERE member_year = (SELECT y FROM yr))
             ELSE member_no END,
           member_since = CASE WHEN $1 = 'active' AND member_since IS NULL THEN (now() AT TIME ZONE 'Asia/Manila')::date ELSE member_since END,
           updated_at = now()
         WHERE id=$2 RETURNING member_no, member_year`,
        [membership, id],
      );
      return row;
    });
    await logActivity(admin.email, "person.membership", before.name, { personId: id, from: before.membership, to: membership });
    let note = `${before.name} is now ${membershipLabel(membership).toLowerCase()}.`;
    const firstActivation = membership === "active" && before.member_no == null;
    if (firstActivation && data.get("sendWelcome") === "on") {
      const mail = welcomeMember({ name: before.name, memberNo: memberNumber(after) });
      const sent = await sendEmail({ to: before.email, ...mail, idempotencyKey: `welcome/${id}` });
      if (sent.ok) {
        await logActivity(admin.email, "person.email", before.name, { personId: id, template: "welcome" });
        note += " Welcome email sent.";
      } else {
        note += sent.skipped ? " Email isn't set up yet, so no welcome email went out." : " The welcome email didn't go through; try Resend welcome.";
      }
    }
    await backWith(back, "ok", note);
  });
}

/** Sends (again) the welcome email to an active member. */
export async function resendWelcome(data) {
  const id = form(data, "id");
  const back = isUuid(id) ? `/people/${id}` : "/people";
  return guarded(back, async () => {
    const admin = await actionAdmin("people:edit");
    const [person] = isUuid(id) ? await sql("SELECT name, email, kind, membership, member_no, member_year FROM people WHERE id=$1", [id]) : [];
    if (!person || person.kind !== "Member" || person.membership !== "active") await backWith(back, "error", "Only active members get the welcome email.");
    const mail = welcomeMember({ name: person.name, memberNo: memberNumber(person) });
    const sent = await sendEmail({ to: person.email, ...mail, idempotencyKey: `welcome/${id}/${Date.now()}` });
    if (!sent.ok) await backWith(back, "error", sent.skipped ? "Email isn't set up yet (Resend key missing)." : "The email didn't go through. Try again in a moment.");
    await logActivity(admin.email, "person.email", person.name, { personId: id, template: "welcome" });
    await backWith(back, "ok", `Welcome email sent to ${person.email}.`);
  });
}

/**
 * Imports the Join sheet (downloaded as CSV). New people are added; people
 * already here keep their details, gaining only what was blank, and the
 * earlier join date.
 */
export async function importPeople(data) {
  const back = "/people/import";
  return guarded(back, async () => {
    const admin = await actionAdmin("people:edit");
    const file = data.get("file");
    if (!file || typeof file === "string" || !file.size) await backWith(back, "error", "Choose the CSV file downloaded from the sheet.");
    if (file.size > 5 * 1024 * 1024) await backWith(back, "error", "That file is larger than a Join sheet should be (5 MB). Check it's the right one.");
    const { people, skipped, columns } = readSheet(await file.text());
    if (!columns.includes("email") || !columns.includes("kind")) await backWith(back, "error", "That file doesn't look like the Join sheet: no Email or Join type column.");
    let added = 0;
    let matched = 0;
    for (const p of people) {
      const [row] = await sql(
        `INSERT INTO people (kind, name, email, social_profile, organization, furbaby_name, message, status, notes, created_at, membership)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, now()), CASE WHEN $1 = 'Member' THEN 'applicant' END)
         ON CONFLICT (kind, lower(email)) DO UPDATE SET
           social_profile = COALESCE(people.social_profile, EXCLUDED.social_profile),
           organization = COALESCE(people.organization, EXCLUDED.organization),
           furbaby_name = COALESCE(people.furbaby_name, EXCLUDED.furbaby_name),
           message = COALESCE(people.message, EXCLUDED.message),
           notes = COALESCE(people.notes, EXCLUDED.notes),
           created_at = LEAST(people.created_at, EXCLUDED.created_at)
         RETURNING (xmax = 0) AS inserted`,
        [p.kind, p.name, p.email, p.socialProfile, p.organization, p.furbabyName, p.message, p.status, p.notes, p.createdAt],
      );
      if (row.inserted) added += 1;
      else matched += 1;
    }
    await logActivity(admin.email, "people.import", `${added} added`, { added, matched, skipped: skipped.length });
    const skippedNote = skipped.length ? ` Skipped ${skipped.length}: ${skipped.slice(0, 5).map((s) => `row ${s.row} (${s.reason})`).join(", ")}${skipped.length > 5 ? "…" : ""}.` : "";
    await backWith(back, "ok", `Imported. ${added} added, ${matched} already here.${skippedNote}`);
  });
}

// ---------- Payments ----------

export async function requestPaymentChange(data) {
  const key = form(data, "method");
  const back = "/payments";
  return guarded(back, async () => {
    const admin = await actionAdmin("payments:request");
    if (!METHODS[key]) await backWith(back, "error", "Unknown payment method.");
    const details = Object.fromEntries(METHODS[key].fields.map(([field]) => [field, form(data, field)]));
    const [current] = await sql("SELECT enabled, details, qr_image FROM payment_methods WHERE key=$1", [key]);
    const { value, error } = validateChange(key, {
      enabled: data.get("enabled") === "on",
      details,
      qrImage: form(data, "qrImage"),
      qrPayload: form(data, "qrPayload"),
      hasQr: Boolean(current.qr_image),
    });
    if (error) await backWith(back, "error", error);
    const live = { enabled: current.enabled, details: current.details, qrImage: current.qr_image };
    if (diffChange(live, value).length === 0) await backWith(back, "error", `Nothing changed for ${METHODS[key].label}.`);

    if (!needsApproval(live, value)) {
      await sql("UPDATE payment_methods SET enabled=false, updated_at=now() WHERE key=$1", [key]);
      await logActivity(admin.email, "payment.disable", METHODS[key].label);
      await alertAdmins(`${METHODS[key].label} hidden from the Support panel`, [`${admin.email} switched ${METHODS[key].label} off.`]);
      await backWith(back, "ok", `${METHODS[key].label} is hidden from the site now.`);
    }

    try {
      await sql(
        `INSERT INTO payment_change_requests (method_key, enabled, details, qr_image, qr_payload, requested_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [key, value.enabled, JSON.stringify(value.details), value.qrImage, value.qrPayload, admin.email],
      );
    } catch (dbError) {
      if (dbError?.code === "23505") await backWith(back, "error", `A ${METHODS[key].label} change is already waiting. Approve, reject or cancel it first.`);
      throw dbError;
    }
    await logActivity(admin.email, "payment.request", METHODS[key].label, { enabled: value.enabled });
    await alertAdmins(`${METHODS[key].label} change waiting for approval`, [
      `${admin.email} asked to change the ${METHODS[key].label} details shown to donors.`,
      "A different Owner needs to review it in the admin, under Payment settings.",
    ]);
    await backWith(back, "ok", "Request sent. A different Owner needs to approve it before it goes live.");
  });
}

export async function cancelPaymentRequest(data) {
  const id = form(data, "id");
  return guarded("/payments", async () => {
    const admin = await actionAdmin("payments:request");
    if (!isUuid(id)) await backWith("/payments", "error", "That request no longer exists.");
    const rows = await sql(
      `UPDATE payment_change_requests SET status='cancelled', decided_at=now()
       WHERE id=$1 AND status='pending' AND (requested_by=$2 OR $3) RETURNING method_key`,
      [id, admin.email, admin.roles.includes("owner")],
    );
    if (!rows.length) await backWith("/payments", "error", "Only the requester or an Owner can cancel this, and only while it's waiting.");
    await logActivity(admin.email, "payment.cancel", METHODS[rows[0].method_key].label, { requestId: id });
    await backWith("/payments", "ok", "Request cancelled. Nothing changed on the site.");
  });
}

export async function decidePaymentRequest(data) {
  const id = form(data, "id");
  const decision = form(data, "decision");
  const back = `/payments/review/${id}`;
  return guarded(back, async () => {
    const admin = await actionAdmin("payments:approve");
    if (!isUuid(id) || !["approve", "reject"].includes(decision)) await backWith("/payments", "error", "That request no longer exists.");
    const [request] = await sql("SELECT * FROM payment_change_requests WHERE id=$1 AND status='pending'", [id]);
    if (!request) await backWith("/payments", "error", "That request was already decided or cancelled.");
    if (!canApprovePaymentChange({ requestedBy: request.requested_by, approverEmail: admin.email, approverRoles: admin.roles })) {
      await backWith(back, "error", "A different Owner from the one who asked has to decide this.");
    }
    const label = METHODS[request.method_key].label;

    if (decision === "reject") {
      await sql("UPDATE payment_change_requests SET status='rejected', decided_by=$1, decided_at=now() WHERE id=$2", [admin.email, id]);
      await logActivity(admin.email, "payment.reject", label, { requestId: id, requestedBy: request.requested_by });
      await alertAdmins(`${label} change rejected`, [`${admin.email} rejected the ${label} change requested by ${request.requested_by}. Nothing changed on the site.`]);
      await backWith("/payments", "ok", "Rejected. The site keeps the current details.");
    }

    if (data.get("confirmed") !== "on") await backWith(back, "error", "Tick the box to confirm you checked the details against HOR's own records.");
    if (!signedInRecently(admin.authTime)) {
      redirect(`${await adminHref("/sign-in")}?reauth=1&next=${encodeURIComponent(await adminHref(back))}`);
    }

    await transaction(async (tx) => {
      await tx.sql(
        `UPDATE payment_methods SET enabled=$1, details=$2, qr_image=COALESCE($3, qr_image), qr_payload=COALESCE($4, qr_payload),
           updated_at=now(), requested_by=$5, approved_by=$6 WHERE key=$7`,
        [request.enabled, JSON.stringify(request.details), request.qr_image, request.qr_payload, request.requested_by, admin.email, request.method_key],
      );
      await tx.sql("UPDATE payment_change_requests SET status='approved', decided_by=$1, decided_at=now() WHERE id=$2", [admin.email, id]);
      await logActivity(admin.email, "payment.approve", label, { requestId: id, requestedBy: request.requested_by }, tx.sql);
    });
    await alertAdmins(`${label} details changed on the Support panel`, [
      `Requested by ${request.requested_by}, approved by ${admin.email}.`,
      "If you didn't expect this, sign in to the admin and switch the method off straight away.",
    ]);
    await backWith("/payments", "ok", `Approved. The Support panel shows the new ${label} details now.`);
  });
}

// ---------- Admins ----------

async function activeOwnerCount(excluding) {
  const [{ count }] = await sql("SELECT count(*)::int AS count FROM admins WHERE active AND 'owner' = ANY(roles) AND email <> $1", [excluding]);
  return count;
}

export async function inviteAdmin(data) {
  return guarded("/admins", async () => {
    const admin = await actionAdmin("admins:manage");
    const [email] = parseEmailList(form(data, "email"));
    const roles = cleanRoles(data.getAll("roles"));
    if (!email) await backWith("/admins", "error", "Enter the person's Google email address.");
    if (!roles.length) await backWith("/admins", "error", "Pick at least one role.");
    await sql(
      `INSERT INTO admins (email, roles, active, invited_by) VALUES ($1, $2, true, $3)
       ON CONFLICT (email) DO UPDATE SET roles=EXCLUDED.roles, active=true`,
      [email, roles, admin.email],
    );
    await logActivity(admin.email, "admin.invite", email, { roles });
    await backWith("/admins", "ok", `${email} can sign in now with that Google account.`);
  });
}

export async function updateAdmin(data) {
  return guarded("/admins", async () => {
    const admin = await actionAdmin("admins:manage");
    const email = parseEmailList(form(data, "email"))[0];
    if (!email) await backWith("/admins", "error", "That admin no longer exists.");
    const remove = form(data, "op") === "remove";
    const roles = remove ? [] : cleanRoles(data.getAll("roles"));
    const envOwners = parseEmailList(process.env.ADMIN_OWNER_EMAILS);
    if (envOwners.includes(email) && (remove || !roles.includes("owner"))) {
      await backWith("/admins", "error", "This Owner is set in Vercel (ADMIN_OWNER_EMAILS). Change it there first.");
    }
    if ((remove || !roles.includes("owner")) && (await activeOwnerCount(email)) === 0) {
      await backWith("/admins", "error", "Keep at least one other Owner before removing this one.");
    }
    if (!remove && !roles.length) await backWith("/admins", "error", "Pick at least one role, or remove the admin.");
    await sql("UPDATE admins SET roles=$1, active=$2 WHERE email=$3", [roles, !remove, email]);
    await logActivity(admin.email, remove ? "admin.remove" : "admin.roles", email, { roles });
    await backWith("/admins", "ok", remove ? `${email} can no longer sign in.` : `Roles saved for ${email}.`);
  });
}

// A form's submit buttons can't be told apart reliably (the clicked button's
// name/value is dropped on some submit paths), so each button gets its own action.
/**
 * Deletes an event for good, with its cover photo. Only when nobody has
 * registered: an event with sign-ups is cancelled instead, so those records
 * stay. The activity log keeps a note of what was deleted.
 */
export async function deleteEvent(data) {
  const id = form(data, "id");
  const back = isUuid(id) ? `/events/${id}` : "/events";
  return guarded(back, async () => {
    const admin = await actionAdmin("events:delete");
    if (!isUuid(id)) await backWith("/events", "error", "That event no longer exists.");
    if (form(data, "confirm") !== "on") await backWith(back, "error", "Tick the box to confirm you want to delete this event for good.");
    const [event] = await sql("SELECT id, title, slug, date, image, image_source, gallery FROM events WHERE id=$1", [id]);
    if (!event) await backWith("/events", "error", "That event no longer exists.");
    const [{ count }] = await sql("SELECT count(*)::int AS count FROM registrations WHERE event_id=$1", [id]);
    if (count > 0) {
      await backWith(back, "error", `${count} ${count === 1 ? "person has" : "people have"} registered for this event, so it can't be deleted. Use "Cancel event" instead; their records stay.`);
    }
    const photoIds = [event.image, event.image_source, ...(Array.isArray(event.gallery) ? event.gallery.map((g) => g?.src) : [])]
      .map((path) => String(path || "").match(/^\/api\/event-image\/([0-9a-f-]{36})$/i)?.[1])
      .filter(Boolean);
    const album = await sql("SELECT public_id FROM event_photos WHERE event_id=$1", [id]);
    await transaction(async (tx) => {
      await tx.sql("DELETE FROM events WHERE id=$1", [id]);
      if (photoIds.length) {
        // Only photos no other event uses.
        await tx.sql(
          `DELETE FROM event_images i WHERE i.id = ANY($1::uuid[])
             AND NOT EXISTS (SELECT 1 FROM events e WHERE e.image = '/api/event-image/' || i.id OR e.image_source = '/api/event-image/' || i.id
                OR e.gallery @> jsonb_build_array(jsonb_build_object('src', '/api/event-image/' || i.id)))`,
          [photoIds],
        );
      }
    });
    // Album photos live in Cloudinary: remove them there too (best effort).
    for (const { public_id: publicId } of album) {
      if (!(await destroyPhoto(publicId))) console.warn("Cloudinary photo not removed; delete it in the Media Library", publicId);
    }
    await logActivity(admin.email, "event.delete", event.title, { slug: event.slug, date: String(event.date).slice(0, 10) });
    revalidatePath("/events", "layout");
    await backWith("/events", "ok", `Deleted "${event.title}".`);
  });
}

export async function publishEvent(data) { data.set("intent", "publish"); return saveEvent(data); }
export async function unpublishEvent(data) { data.set("intent", "unpublish"); return saveEvent(data); }
export async function cancelEvent(data) { data.set("intent", "cancel"); return saveEvent(data); }
export async function approvePaymentRequest(data) { data.set("decision", "approve"); return decidePaymentRequest(data); }
export async function rejectPaymentRequest(data) { data.set("decision", "reject"); return decidePaymentRequest(data); }
export async function removeAdmin(data) { data.set("op", "remove"); return updateAdmin(data); }
