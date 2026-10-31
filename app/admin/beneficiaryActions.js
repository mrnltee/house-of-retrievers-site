"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { cleanBeneficiary } from "../lib/beneficiaries.mjs";

const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const FIELDS = ["name", "kind", "status", "description", "needs", "location", "website", "instagram", "contactName", "contactEmail", "contactPhone", "address", "salutation", "notes"];

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** Beneficiaries: add or update one. */
export async function saveBeneficiary(data) {
  const id = form(data, "id");
  const back = isUuid(id) ? `/beneficiaries/${id}` : "/beneficiaries/new";
  return guarded(back, async () => {
    const admin = await actionAdmin("beneficiaries:edit");
    const { beneficiary: b, error } = cleanBeneficiary(Object.fromEntries(FIELDS.map((k) => [k, form(data, k)])));
    if (error) await backWith(back, "error", error);
    const [taken] = await sql("SELECT id FROM beneficiaries WHERE deleted_at IS NULL AND lower(name) = lower($1) AND id IS DISTINCT FROM $2", [b.name, isUuid(id) ? id : null]);
    if (taken) await backWith(back, "error", `${b.name} is already in Beneficiaries.`);
    const values = [b.name, b.kind, b.status, b.description, b.needs, b.location, b.website, b.instagram, b.contactName, b.contactEmail, b.contactPhone, b.address, b.salutation, b.notes];
    if (isUuid(id)) {
      await sql(
        `UPDATE beneficiaries SET name=$1, kind=$2, status=$3, description=$4, needs=$5, location=$6, website=$7, instagram=$8, contact_name=$9,
           contact_email=$10, contact_phone=$11, address=$12, salutation=$13, notes=$14, updated_at=now() WHERE id=$15 AND deleted_at IS NULL`,
        [...values, id],
      );
      await logActivity(admin.email, "beneficiary.update", b.name, { beneficiaryId: id });
      await backWith(back, "ok", `Saved ${b.name}.`);
    }
    const [row] = await sql(
      `INSERT INTO beneficiaries (name, kind, status, description, needs, location, website, instagram, contact_name, contact_email, contact_phone, address, salutation, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [...values, admin.email],
    );
    await logActivity(admin.email, "beneficiary.add", b.name, { beneficiaryId: row.id });
    await backWith(`/beneficiaries/${row.id}`, "ok", `Added ${b.name}.`);
  });
}

/** Beneficiaries: remove one (kept in the database, hidden from the list). */
export async function removeBeneficiary(data) {
  const id = form(data, "id");
  return guarded("/beneficiaries", async () => {
    const admin = await actionAdmin("beneficiaries:edit");
    if (!isUuid(id)) await backWith("/beneficiaries", "error", "That beneficiary wasn't found.");
    const [row] = await sql("UPDATE beneficiaries SET deleted_at=now() WHERE id=$1 AND deleted_at IS NULL RETURNING name", [id]);
    if (row) await logActivity(admin.email, "beneficiary.remove", row.name, { beneficiaryId: id });
    await backWith("/beneficiaries", "ok", row ? `Removed ${row.name}.` : "Already removed.");
  });
}
