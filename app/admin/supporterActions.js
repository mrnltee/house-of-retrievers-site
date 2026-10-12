"use server";

import { sql, transaction } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { supporterNumber, supporterSlug, validateSupporter } from "../lib/supporters.mjs";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
/** Logos are resized in the browser (longest side 800); this is a ceiling against tampering. */
const MAX_LOGO_BYTES = 700 * 1024;

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** A free slug for `name`, skipping the record's own. */
async function freeSlug(name, id) {
  const base = supporterSlug(name);
  const taken = await sql("SELECT slug FROM supporters WHERE (slug = $1 OR slug LIKE $2) AND id IS DISTINCT FROM $3", [base, `${base}-%`, id || null]);
  if (!taken.some((r) => r.slug === base)) return base;
  let n = 2;
  while (taken.some((r) => r.slug === `${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Saves a sponsor or partner record (create or edit). */
export async function saveSupporter(data) {
  const id = form(data, "id");
  const back = isUuid(id) ? `/supporters/${id}` : "/supporters/new";
  return guarded(back, async () => {
    const admin = await actionAdmin("people:edit");
    const input = Object.fromEntries([...data.entries()].filter(([, v]) => typeof v === "string"));
    input.gives = data.getAll("gives").filter((v) => typeof v === "string");

    // A new logo arrives as a data URL; store it like event photos and keep its address.
    const upload = form(data, "logoData");
    if (upload) {
      const match = upload.match(/^data:(image\/(?:png|webp|jpeg));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) await backWith(back, "error", "That logo didn't come through. Try a PNG or JPG.");
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length > MAX_LOGO_BYTES) await backWith(back, "error", "That logo is too large. Try a smaller file.");
      const [saved] = await sql("INSERT INTO event_images (mime, data, bytes, created_by) VALUES ($1, $2, $3, $4) RETURNING id", [match[1], bytes, bytes.length, admin.email]);
      input.logo = `/api/event-image/${saved.id}`;
    } else if (form(data, "logoRemove")) {
      input.logo = "";
    }

    const { value, error, notes } = validateSupporter(input);
    if (error) await backWith(back, "error", error);
    if (value.status === "ended") value.showOnSite = false;

    const [clash] = await sql("SELECT id FROM supporters WHERE lower(name) = lower($1) AND id IS DISTINCT FROM $2", [value.name, isUuid(id) ? id : null]);
    if (clash) await backWith(back, "error", `There's already a record called "${value.name}".`);

    const slug = await freeSlug(value.name, isUuid(id) ? id : null);
    const before = isUuid(id) ? (await sql("SELECT * FROM supporters WHERE id = $1", [id]))[0] : null;
    if (isUuid(id) && !before) await backWith("/supporters", "error", "That record no longer exists.");
    // The code is part of their number, so it stays once a number is given.
    if (before?.number_no) value.code = before.code;
    if (value.code) {
      const [taken] = await sql("SELECT name FROM supporters WHERE code = $1 AND id IS DISTINCT FROM $2", [value.code, before?.id || null]);
      if (taken) await backWith(back, "error", `The code ${value.code} is already ${taken.name}'s. Pick another 3 letters.`);
    }

    // "Told about public amounts": dated the first time it's ticked, cleared when unticked.
    const agreedAt = value.amountsAgreed ? before?.amounts_agreed_at || new Date().toISOString().slice(0, 10) : null;
    const agreedBy = value.amountsAgreed ? before?.amounts_agreed_by || admin.email : null;

    const fields = [
      value.kind, value.name, slug, value.status, value.tier, value.logo, value.website, value.instagram, value.blurb, value.gives,
      value.supportYear, value.cashAmount, value.inKindValue, value.inKindNote, value.showOnSite, agreedAt, agreedBy,
      value.contactName, value.contactEmail, value.contactPhone, value.notes,
    ];
    let recordId = id;
    if (before) {
      await sql(
        `UPDATE supporters SET kind=$1, name=$2, slug=$3, status=$4, tier=$5, logo=$6, website=$7, instagram=$8, blurb=$9, gives=$10,
           support_year=$11, cash_amount=$12, in_kind_value=$13, in_kind_note=$14, show_on_site=$15, amounts_agreed_at=$16, amounts_agreed_by=$17,
           contact_name=$18, contact_email=$19, contact_phone=$20, notes=$21, code=$23, updated_at=now()
         WHERE id=$22`,
        [...fields, id, value.code],
      );
    } else {
      const [row] = await sql(
        `INSERT INTO supporters (kind, name, slug, status, tier, logo, website, instagram, blurb, gives, support_year, cash_amount, in_kind_value,
           in_kind_note, show_on_site, amounts_agreed_at, amounts_agreed_by, contact_name, contact_email, contact_phone, notes, person_id, code)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING id`,
        [...fields, isUuid(form(data, "personId")) ? form(data, "personId") : null, value.code],
      );
      recordId = row.id;
    }

    // First time Confirmed: HOR-XXX-YY-NNNN, YY = the year they registered
    // (the Join form if they came through it, else when the record was made).
    let numbered = "";
    if (value.status === "confirmed" && !before?.number_no) {
      numbered = await transaction(async (tx) => {
        await tx.sql("SELECT pg_advisory_xact_lock(727011)");
        const [row] = await tx.sql(
          `WITH me AS (
             SELECT extract(year FROM coalesce(p.created_at, s.created_at) AT TIME ZONE 'Asia/Manila')::smallint AS y
               FROM supporters s LEFT JOIN people p ON p.id = s.person_id WHERE s.id = $1)
           UPDATE supporters SET number_year = (SELECT y FROM me),
             number_no = (SELECT coalesce(max(number_no), 0) + 1 FROM supporters WHERE number_year = (SELECT y FROM me))
           WHERE id = $1 AND number_no IS NULL RETURNING code, number_year, number_no`,
          [recordId],
        );
        return supporterNumber(row);
      });
    }

    const details = { supporterId: recordId };
    if (numbered) details.number = numbered;
    if (before && before.status !== value.status) details.status = value.status;
    if (before && before.show_on_site !== value.showOnSite) details.website = value.showOnSite ? "shown" : "hidden";
    if (!before?.amounts_agreed_at && agreedAt) details.amounts = "agreed";
    await logActivity(admin.email, before ? "supporter.save" : "supporter.create", value.name, details);
    const message = ["Saved.", numbered ? `Their number is ${numbered}.` : "", ...(notes || [])].filter(Boolean).join(" ");
    await backWith(`/supporters/${recordId}`, notes?.length ? "error" : "ok", message);
  });
}

/** "Make a sponsor record" on a Sponsor or Partner in People: one record per organisation. */
export async function supporterFromPerson(data) {
  const personId = form(data, "personId");
  const back = isUuid(personId) ? `/people/${personId}` : "/people";
  return guarded(back, async () => {
    const admin = await actionAdmin("people:edit");
    const [person] = isUuid(personId) ? await sql("SELECT * FROM people WHERE id = $1", [personId]) : [];
    if (!person || !["Sponsor", "Partner"].includes(person.kind)) await backWith(back, "error", "Only Sponsors and Partners get a record.");
    const name = (person.organization || person.name || "").trim().slice(0, 80);
    const [existing] = await sql("SELECT id FROM supporters WHERE person_id = $1 OR lower(name) = lower($2) LIMIT 1", [personId, name]);
    if (existing) await backWith(`/supporters/${existing.id}`, "ok", "This record already exists.");
    const [row] = await sql(
      `INSERT INTO supporters (kind, name, slug, status, contact_name, contact_email, instagram, notes, person_id)
       VALUES ($1, $2, $3, 'inquiry', $4, $5, $6, $7, $8) RETURNING id`,
      [person.kind, name, await freeSlug(name), person.name, person.email, /^@?[A-Za-z0-9._]{1,30}$/.test(person.social_profile || "") ? person.social_profile.replace(/^@/, "") : null, person.message ? `From the Join form: ${person.message}`.slice(0, 2000) : null, personId],
    );
    await logActivity(admin.email, "supporter.create", name, { supporterId: row.id, personId });
    await backWith(`/supporters/${row.id}`, "ok", "Record created from the Join form. Add a logo and blurb when they're confirmed.");
  });
}
