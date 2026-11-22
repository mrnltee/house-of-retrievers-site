"use server";

import { revalidatePath } from "next/cache";
import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { cleanEntry, needsProof } from "../lib/ledger.mjs";
import { sniffFile } from "../lib/donationForm.mjs";

/**
 * Ledger lines (owner, 22 Nov 2026): Treasurers and Owners (ledger:edit) add and edit expenses, other income,
 * in-kind items and turnovers to beneficiaries. Receipts and proofs travel with the form as data URLs (shrunk
 * in the browser by ProofPicker, under the 4 MB request cap) and are stored in ledger_files, served to admins
 * only by /ledger/file/<id>. An expense or a turnover can't be saved without proof, and its last proof can't
 * be removed. Removing a line hides it (deleted_at).
 */

const MAX_FILE = 3 * 1024 * 1024;
const MAX_FILES = 10;
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const form = (data, key) => (typeof data.get(key) === "string" ? data.get(key) : "");
const safeName = (name) => String(name || "").replace(/[^\w .()&,-]+/g, "_").trim().slice(0, 160) || "receipt";
const backTo = (data) => {
  const scope = form(data, "back");
  return `/ledger${isUuid(scope) || scope === "general" ? `?event=${scope}` : ""}`;
};

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** The receipts sent with a form: [{ bytes, mime, name }] or { error }. */
function readProofs(data) {
  const urls = data.getAll("proofData").filter((v) => typeof v === "string" && v);
  const names = data.getAll("proofName");
  if (urls.length > MAX_FILES) return { error: `Attach up to ${MAX_FILES} files at a time.` };
  const out = [];
  for (const [i, url] of urls.entries()) {
    const m = url.match(/^data:[\w/+.-]+;base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return { error: "One of the files couldn't be read. Choose it again." };
    const bytes = Buffer.from(m[1], "base64");
    if (!bytes.length || bytes.length > MAX_FILE) return { error: "Each file must be under 3 MB." };
    const mime = sniffFile(bytes);
    if (!mime) return { error: "Use a PDF or a photo (JPEG, PNG or WebP)." };
    out.push({ bytes, mime, name: safeName(names[i]) });
  }
  return { files: out };
}

async function storeProofs(entryId, files, who) {
  for (const f of files) {
    await sql("INSERT INTO ledger_files (entry_id, mime, name, size, data, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6)", [entryId, f.mime, f.name, f.bytes.length, f.bytes, who]);
  }
}

const describe = (e) => `${e.description} · ₱${Number(e.amount || 0).toLocaleString("en-PH")}`;

/** Add a line, or save changes to one (`id`). */
export async function saveLedgerEntry(data) {
  const back = backTo(data);
  return guarded(back, async () => {
    const admin = await actionAdmin("ledger:edit");
    const id = form(data, "id");
    const { entry: e, error } = cleanEntry(Object.fromEntries(["kind", "date", "category", "description", "party", "beneficiary", "amount", "quantity", "method", "reference", "showName", "notes", "event"].map((k) => [k, form(data, k)])));
    if (error) await backWith(back, "error", error);
    const proofs = readProofs(data);
    if (proofs.error) await backWith(back, "error", proofs.error);
    if (e.eventId) {
      const [ev] = await sql("SELECT 1 FROM events WHERE id = $1", [e.eventId]);
      if (!ev) await backWith(back, "error", "That event no longer exists. Choose another, or Not tied to an event.");
    }
    if (e.beneficiaryId) {
      const [b] = await sql("SELECT name FROM beneficiaries WHERE id = $1 AND deleted_at IS NULL", [e.beneficiaryId]);
      if (!b) await backWith(back, "error", "That beneficiary isn't on the list any more.");
    }
    const values = [e.eventId, e.kind, e.date, e.category, e.description, e.party, e.beneficiaryId, e.amount, e.quantity, e.method, e.reference, e.showName, e.notes, admin.email];
    if (isUuid(id)) {
      const [old] = await sql("SELECT kind, (SELECT count(*) FROM ledger_files f WHERE f.entry_id = le.id)::int AS files FROM ledger_entries le WHERE id = $1 AND deleted_at IS NULL", [id]);
      if (!old) await backWith(back, "error", "That line was removed.");
      if (needsProof(e.kind) && old.files + proofs.files.length === 0) await backWith(back, "error", e.kind === "expense" ? "Attach the receipt: every expense needs one." : "Attach the proof of handover: every turnover needs one.");
      await sql(
        `UPDATE ledger_entries SET event_id=$2, kind=$3, entry_date=$4, category=$5, description=$6, party=$7, beneficiary_id=$8, amount=$9, quantity=$10,
                method=$11, reference=$12, show_name=$13, notes=$14, updated_by=$15, updated_at=now() WHERE id=$1`,
        [id, ...values],
      );
      await storeProofs(id, proofs.files, admin.email);
      await logActivity(admin.email, "ledger.edit", describe(e), { entryId: id, eventId: e.eventId, kind: e.kind, amount: e.amount, added: proofs.files.length });
      revalidatePath("/ledger");
      await backWith(back, "ok", `Saved: ${e.description}.`);
    }
    if (needsProof(e.kind) && !proofs.files.length) await backWith(back, "error", e.kind === "expense" ? "Attach the receipt: every expense needs one." : "Attach the proof of handover: every turnover needs one.");
    const [row] = await sql(
      `INSERT INTO ledger_entries (event_id, kind, entry_date, category, description, party, beneficiary_id, amount, quantity, method, reference, show_name, notes, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14) RETURNING id`,
      values,
    );
    await storeProofs(row.id, proofs.files, admin.email);
    await logActivity(admin.email, "ledger.add", describe(e), { entryId: row.id, eventId: e.eventId, kind: e.kind, amount: e.amount, files: proofs.files.length });
    revalidatePath("/ledger");
    await backWith(back, "ok", `Added: ${e.description}.`);
  });
}

/** Remove a line from the ledger and the report (kept, hidden, for the activity log). */
export async function removeLedgerEntry(data) {
  const back = backTo(data);
  return guarded(back, async () => {
    const admin = await actionAdmin("ledger:edit");
    const id = form(data, "id");
    const [gone] = isUuid(id) ? await sql("UPDATE ledger_entries SET deleted_at = now(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING description, amount, kind, event_id", [id, admin.email]) : [];
    if (gone) await logActivity(admin.email, "ledger.remove", describe(gone), { entryId: id, eventId: gone.event_id, kind: gone.kind, amount: gone.amount });
    revalidatePath("/ledger");
    await backWith(back, "ok", gone ? `Removed: ${gone.description}.` : "That line was already removed.");
  });
}

/** Put a removed line back in the ledger and the report. */
export async function restoreLedgerEntry(data) {
  const back = backTo(data);
  return guarded(back, async () => {
    const admin = await actionAdmin("ledger:edit");
    const id = form(data, "id");
    const [row] = isUuid(id) ? await sql("UPDATE ledger_entries SET deleted_at = NULL, updated_by = $2, updated_at = now() WHERE id = $1 AND deleted_at IS NOT NULL RETURNING description, amount, kind, event_id", [id, admin.email]) : [];
    if (row) await logActivity(admin.email, "ledger.restore", describe(row), { entryId: id, eventId: row.event_id, kind: row.kind, amount: row.amount });
    revalidatePath("/ledger");
    await backWith(back, "ok", row ? `Restored: ${row.description}.` : "That line is already in the ledger.");
  });
}

/** Remove one receipt or proof. An expense's or turnover's last proof stays: attach another first. */
export async function removeLedgerFile(data) {
  try {
    const admin = await actionAdmin("ledger:edit");
    const id = form(data, "id");
    if (!isUuid(id)) return { ok: true };
    const [file] = await sql(
      `SELECT f.name, f.entry_id, le.kind, le.description, (SELECT count(*) FROM ledger_files o WHERE o.entry_id = f.entry_id)::int AS total
         FROM ledger_files f JOIN ledger_entries le ON le.id = f.entry_id WHERE f.id = $1`,
      [id],
    );
    if (!file) return { ok: true };
    if (needsProof(file.kind) && file.total <= 1) return { error: file.kind === "expense" ? "That's the expense's only receipt. Attach the right one first, then remove this." : "That's the only proof of handover. Attach another first, then remove this." };
    await sql("DELETE FROM ledger_files WHERE id = $1", [id]);
    await logActivity(admin.email, "ledger.file.remove", file.name || "", { entryId: file.entry_id, description: file.description });
    return { ok: true };
  } catch (error) {
    if (error instanceof Forbidden) return { error: error.message };
    throw error;
  }
}
