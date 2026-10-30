"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { cleanContact } from "../lib/contacts.mjs";

const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const fields = (data) => Object.fromEntries(["category", "name", "organization", "email", "phone", "handle", "address", "salutation", "notes"].map((k) => [k, form(data, k)]));

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** Guest list: add or update one contact. */
export async function saveContact(data) {
  const id = form(data, "id");
  const back = isUuid(id) ? `/guests/${id}` : "/guests";
  return guarded(back, async () => {
    const admin = await actionAdmin("guests:edit");
    const { contact: c, error } = cleanContact(fields(data));
    if (error) await backWith(back, "error", error);
    if (isUuid(id)) {
      await sql(
        `UPDATE letter_contacts SET category=$2, name=$3, organization=$4, email=$5, phone=$6, handle=$7, notes=$8, address=$9, salutation=$10, updated_at=now()
          WHERE id=$1 AND deleted_at IS NULL`,
        [id, c.category, c.name, c.organization, c.email, c.phone, c.handle, c.notes, c.address, c.salutation],
      );
      await logActivity(admin.email, "contact.update", c.name, { contactId: id });
      await backWith(`/guests?category=${c.category}`, "ok", `Saved ${c.name}.`);
    }
    const dupe = await sql("SELECT 1 FROM letter_contacts WHERE deleted_at IS NULL AND lower(name)=lower($1) AND category=$2", [c.name, c.category]);
    if (dupe.length) await backWith(`/guests?category=${c.category}`, "error", `${c.name} is already in this category.`);
    await sql(
      `INSERT INTO letter_contacts (category, name, organization, email, phone, handle, notes, created_by, address, salutation) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [c.category, c.name, c.organization, c.email, c.phone, c.handle, c.notes, admin.email, c.address, c.salutation],
    );
    await logActivity(admin.email, "contact.add", c.name, { category: c.category });
    await backWith(`/guests?category=${c.category}`, "ok", `Added ${c.name}.`);
  });
}

/** Guest list: remove a contact (kept in the database, hidden from the list). */
export async function removeContact(data) {
  const id = form(data, "id");
  return guarded("/guests", async () => {
    const admin = await actionAdmin("guests:edit");
    if (!isUuid(id)) await backWith("/guests", "error", "That contact wasn't found.");
    const [row] = await sql("UPDATE letter_contacts SET deleted_at=now() WHERE id=$1 AND deleted_at IS NULL RETURNING name", [id]);
    if (row) await logActivity(admin.email, "contact.remove", row.name, { contactId: id });
    await backWith("/guests", "ok", row ? `Removed ${row.name}.` : "Already removed.");
  });
}
